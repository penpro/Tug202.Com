const express = require('express');
const pool = require('../db');
const { str, email } = require('../validate');

// People-centric contact API for the /admin CMS screen (mounted under
// /api/admin, behind the bearer token). One object per person with the
// emails nested — the contact_emails rows are candidates/permutations of the
// same person, not separate contacts.
//
//   GET    /api/admin/people?q=&tag=&status=&source=&optin=1
//   GET    /api/admin/people/:id
//   POST   /api/admin/people                 { name, city, email, ... }
//   PATCH  /api/admin/people/:id             { name | city | address | phone | event | event_date | tags | notes | optin }
//   DELETE /api/admin/people/:id
//   POST   /api/admin/people/:id/emails      { email, kind }
//   PATCH  /api/admin/emails/:id             { status | status_note | kind | confidence }
//   DELETE /api/admin/emails/:id
//   POST   /api/admin/people/:into/merge/:from

const router = express.Router();

const STATUSES = ['unverified', 'sent', 'bounced', 'confirmed', 'unsubscribed'];
const KINDS = ['primary', 'alternate', 'permutation'];
const CONF = ['high', 'medium', 'low', 'very low'];
const PERSON_FIELDS = ['name', 'city', 'address', 'phone', 'event', 'event_date', 'tags', 'notes'];

async function loadPeople(where, args) {
  const [people] = await pool.query(
    `SELECT id, legacy_id, name, city, address, phone, source, source_ref, event, event_date, optin, tags, notes, created_at, updated_at
       FROM contacts ${where ? 'WHERE ' + where : ''} ORDER BY name, id LIMIT 2000`, args);
  if (!people.length) return [];
  const [emails] = await pool.query(
    `SELECT id, contact_id, email, kind, confidence, status, status_at, status_note FROM contact_emails
      WHERE contact_id IN (?) ORDER BY FIELD(kind, 'primary', 'alternate', 'permutation'), id`,
    [people.map(p => p.id)]);
  const byContact = {};
  for (const e of emails) (byContact[e.contact_id] ||= []).push(e);
  return people.map(p => ({ ...p, optin: !!p.optin, emails: byContact[p.id] || [] }));
}

async function one(id) { const [p] = await loadPeople('id = ?', [Number(id)]); return p; }

router.get('/people', async (req, res, next) => {
  try {
    const where = []; const args = [];
    if (req.query.q) {
      const like = `%${str(req.query.q, 80)}%`;
      where.push('(name LIKE ? OR city LIKE ? OR event LIKE ? OR notes LIKE ? OR id IN (SELECT contact_id FROM contact_emails WHERE email LIKE ?))');
      args.push(like, like, like, like, like);
    }
    if (req.query.tag) { where.push('FIND_IN_SET(?, tags)'); args.push(str(req.query.tag, 40)); }
    if (req.query.source) { where.push('source = ?'); args.push(str(req.query.source, 40)); }
    if (req.query.status && STATUSES.includes(req.query.status)) {
      where.push('id IN (SELECT contact_id FROM contact_emails WHERE status = ?)'); args.push(req.query.status);
    }
    if (req.query.optin === '1') where.push('optin = 1');
    const people = await loadPeople(where.join(' AND '), args);
    const [[tot]] = await pool.query('SELECT COUNT(*) AS people, (SELECT COUNT(*) FROM contact_emails) AS emails FROM contacts');
    const [byStatus] = await pool.query('SELECT status, COUNT(*) AS n FROM contact_emails GROUP BY status');
    const [tagRows] = await pool.query("SELECT tags FROM contacts WHERE tags <> ''");
    const tags = [...new Set(tagRows.flatMap(t => t.tags.split(',')))].filter(Boolean).sort();
    res.json({ totals: { ...tot, byStatus: Object.fromEntries(byStatus.map(r => [r.status, r.n])) }, tags, people });
  } catch (err) { next(err); }
});

router.get('/people/:id', async (req, res, next) => {
  try {
    const p = await one(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) { next(err); }
});

router.post('/people', async (req, res, next) => {
  try {
    const b = req.body || {};
    const name = str(b.name, 160);
    if (!name) return res.status(400).json({ error: 'name required' });
    const [r] = await pool.execute(
      'INSERT INTO contacts (name, city, address, phone, source, source_ref, event, event_date, optin, tags, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, str(b.city, 120), str(b.address, 300), str(b.phone, 40), str(b.source || 'manual', 60), str(b.source_ref, 120),
       str(b.event, 160), str(b.event_date, 40), b.optin ? 1 : 0, str(b.tags, 300), str(b.notes, 5000)]);
    const e = email(b.email);
    if (e) await pool.execute('INSERT IGNORE INTO contact_emails (contact_id, email, kind, confidence) VALUES (?, ?, "primary", "high")', [r.insertId, e]);
    res.status(201).json(await one(r.insertId));
  } catch (err) { next(err); }
});

router.patch('/people/:id', async (req, res, next) => {
  try {
    const b = req.body || {}; const sets = []; const args = [];
    for (const f of PERSON_FIELDS) if (f in b) { sets.push(`${f} = ?`); args.push(str(b[f], f === 'notes' ? 5000 : 300)); }
    if ('optin' in b) { sets.push('optin = ?'); args.push(b.optin ? 1 : 0); }
    if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
    await pool.execute(`UPDATE contacts SET ${sets.join(', ')} WHERE id = ?`, [...args, Number(req.params.id)]);
    const p = await one(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) { next(err); }
});

router.delete('/people/:id', async (req, res, next) => {
  try {
    const [r] = await pool.execute('DELETE FROM contacts WHERE id = ?', [Number(req.params.id)]);
    res.json({ deleted: r.affectedRows });
  } catch (err) { next(err); }
});

router.post('/people/:id/emails', async (req, res, next) => {
  try {
    const e = email(req.body?.email);
    if (!e) return res.status(400).json({ error: 'valid email required' });
    const kind = KINDS.includes(req.body?.kind) ? req.body.kind : 'alternate';
    await pool.execute(
      'INSERT INTO contact_emails (contact_id, email, kind, confidence) VALUES (?, ?, ?, "high") ON DUPLICATE KEY UPDATE kind = VALUES(kind)',
      [Number(req.params.id), e, kind]);
    res.json(await one(req.params.id));
  } catch (err) { next(err); }
});

router.patch('/emails/:id', async (req, res, next) => {
  try {
    const b = req.body || {}; const sets = []; const args = [];
    if (b.status && STATUSES.includes(b.status)) { sets.push('status = ?', 'status_at = NOW()'); args.push(b.status); }
    if ('status_note' in b) { sets.push('status_note = ?'); args.push(str(b.status_note, 300)); }
    if (b.kind && KINDS.includes(b.kind)) { sets.push('kind = ?'); args.push(b.kind); }
    if (b.confidence && CONF.includes(b.confidence)) { sets.push('confidence = ?'); args.push(b.confidence); }
    if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
    const id = Number(req.params.id);
    await pool.execute(`UPDATE contact_emails SET ${sets.join(', ')} WHERE id = ?`, [...args, id]);
    const [[row]] = await pool.query('SELECT contact_id FROM contact_emails WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(await one(row.contact_id));
  } catch (err) { next(err); }
});

router.delete('/emails/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[row]] = await pool.query('SELECT contact_id FROM contact_emails WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    await pool.execute('DELETE FROM contact_emails WHERE id = ?', [id]);
    res.json(await one(row.contact_id));
  } catch (err) { next(err); }
});

// Merge duplicates: emails from :from move under :into (dupes dropped), :from is deleted.
router.post('/people/:into/merge/:from', async (req, res, next) => {
  try {
    const into = Number(req.params.into), from = Number(req.params.from);
    if (into === from) return res.status(400).json({ error: 'same id' });
    await pool.execute('UPDATE IGNORE contact_emails SET contact_id = ? WHERE contact_id = ?', [into, from]);
    await pool.execute('DELETE FROM contacts WHERE id = ?', [from]); // cascades any leftover dupes
    res.json(await one(into));
  } catch (err) { next(err); }
});

module.exports = router;
