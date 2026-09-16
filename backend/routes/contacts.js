const express = require('express');
const pool = require('../db');
const { str, email } = require('../validate');

// Admin-only contact list (mounted under /api/admin, behind the bearer token).
//
//   GET  /api/admin/contacts-list?status=unverified&tag=pt-local&q=olympia
//   GET  /api/admin/contacts-list/export.csv?status=unverified   -> flat send list
//   POST /api/admin/contacts-list/status  { email, status, note }  -> record a bounce/confirm
//   POST /api/admin/contacts-list/bounces { emails: [..] }          -> bulk mark bounced
//
// Once HTTPS + logins exist this becomes the CRM screen; until then it is
// curl-driven and the CSV export feeds whatever mail tool sends the first blast.

const router = express.Router();

const STATUSES = ['unverified', 'sent', 'bounced', 'confirmed', 'unsubscribed'];

async function fetchList(q) {
  const where = []; const args = [];
  if (q.status && STATUSES.includes(q.status)) { where.push('e.status = ?'); args.push(q.status); }
  if (q.kind) { where.push('e.kind = ?'); args.push(str(q.kind, 20)); }
  if (q.tag) { where.push('FIND_IN_SET(?, c.tags)'); args.push(str(q.tag, 40)); }
  if (q.q) { where.push('(c.name LIKE ? OR c.city LIKE ? OR c.event LIKE ? OR e.email LIKE ?)'); const like = `%${str(q.q, 80)}%`; args.push(like, like, like, like); }
  const [rows] = await pool.query(
    `SELECT c.id AS contact_id, c.legacy_id, c.name, c.city, c.event, c.event_date, c.optin, c.tags,
            e.id AS email_id, e.email, e.kind, e.confidence, e.status, e.status_at, e.status_note
       FROM contacts c JOIN contact_emails e ON e.contact_id = c.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY c.id, FIELD(e.kind, 'primary', 'alternate', 'permutation'), e.id
      LIMIT 5000`, args);
  return rows;
}

router.get('/contacts-list', async (req, res, next) => {
  try {
    const rows = await fetchList(req.query);
    const [[{ people }]] = await pool.query('SELECT COUNT(*) AS people FROM contacts');
    const [byStatus] = await pool.query('SELECT status, COUNT(*) AS n FROM contact_emails GROUP BY status');
    res.json({ people, byStatus, rows });
  } catch (err) { next(err); }
});

router.get('/contacts-list/export.csv', async (req, res, next) => {
  try {
    const rows = await fetchList(req.query);
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['contact_id', 'legacy_id', 'name', 'city', 'event', 'email', 'kind', 'confidence', 'status', 'optin', 'tags'];
    const lines = [head.join(',')].concat(rows.map(r => head.map(h => esc(r[h])).join(',')));
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="contacts-export.csv"');
    res.send(lines.join('\r\n'));
  } catch (err) { next(err); }
});

router.post('/contacts-list/status', async (req, res, next) => {
  try {
    const e = email(req.body?.email); const status = str(req.body?.status, 20); const note = str(req.body?.note, 300);
    if (!e || !STATUSES.includes(status)) return res.status(400).json({ error: 'email and a valid status are required' });
    const [r] = await pool.execute('UPDATE contact_emails SET status = ?, status_at = NOW(), status_note = ? WHERE email = ?', [status, note, e]);
    res.json({ updated: r.affectedRows });
  } catch (err) { next(err); }
});

router.post('/contacts-list/bounces', async (req, res, next) => {
  try {
    const list = Array.isArray(req.body?.emails) ? req.body.emails.map(email).filter(Boolean) : [];
    if (!list.length) return res.status(400).json({ error: 'emails[] required' });
    const [r] = await pool.query('UPDATE contact_emails SET status = "bounced", status_at = NOW() WHERE email IN (?)', [list]);
    res.json({ updated: r.affectedRows });
  } catch (err) { next(err); }
});

// Mark every address we attempted as sent, so the next export excludes them.
router.post('/contacts-list/mark-sent', async (req, res, next) => {
  try {
    const list = Array.isArray(req.body?.emails) ? req.body.emails.map(email).filter(Boolean) : [];
    if (!list.length) return res.status(400).json({ error: 'emails[] required' });
    const [r] = await pool.query('UPDATE contact_emails SET status = "sent", status_at = NOW() WHERE email IN (?) AND status = "unverified"', [list]);
    res.json({ updated: r.affectedRows });
  } catch (err) { next(err); }
});

module.exports = router;
