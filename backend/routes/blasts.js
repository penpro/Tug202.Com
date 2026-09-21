const express = require('express');
const https = require('https');
const pool = require('../db');
const { str, email } = require('../validate');
const { deliver, backendName } = require('../mailer');
const { render, verifyUnsubToken } = require('../mail-template');

// ---------------------------------------------------------------------------
// Mail blasts.
//   admin (mounted under /api/admin, behind requireAuth):
//     GET    /blasts                 list
//     POST   /blasts                 create draft {subject, preheader, body, image, audience}
//     GET    /blasts/:id             detail + recipient stats
//     PATCH  /blasts/:id             edit draft
//     DELETE /blasts/:id             delete draft
//     POST   /blasts/preview         {subject, preheader, body, image} -> rendered html/text
//     POST   /blasts/audience        {audience} -> {count, sample}
//     POST   /blasts/:id/test        send to the signed-in user only
//     POST   /blasts/:id/send        build recipient list and start sending
//     POST   /blasts/:id/pause | resume
//     GET    /blasts/:id/recipients?status=
//   public (mounted at /api):
//     GET    /unsubscribe?t=…        one-click unsubscribe, renders a page
//     POST   /ses/events             SNS webhook for bounces/complaints
// ---------------------------------------------------------------------------

const admin = express.Router();
const pub = express.Router();

const SEND_INTERVAL_MS = 250;   // ~4/s; SES sandbox allows 1/s, production 14/s
const SUPPRESSED = "SELECT DISTINCT email FROM contact_emails WHERE status IN ('bounced','unsubscribed') UNION SELECT DISTINCT email FROM blast_recipients WHERE status IN ('bounced','complained') UNION SELECT email FROM newsletter_subscribers WHERE unsubscribed_at IS NOT NULL";

// ---- audience ---------------------------------------------------------------
// audience: { source: 'crm'|'subscribers'|'both', statuses: [...], kinds: [...], tag, confidence: [...] }
async function buildAudience(a) {
  const out = new Map(); // email -> { email, name, contact_email_id }
  const src = a.source || 'crm';
  if (src === 'crm' || src === 'both') {
    const where = []; const args = [];
    const statuses = (a.statuses || ['unverified']).filter(s => ['unverified', 'sent', 'confirmed'].includes(s));
    where.push(`e.status IN (${statuses.map(() => '?').join(',') || "''"})`); args.push(...statuses);
    const kinds = (a.kinds || ['primary']).filter(k => ['primary', 'alternate', 'permutation'].includes(k));
    if (kinds.length) { where.push(`e.kind IN (${kinds.map(() => '?').join(',')})`); args.push(...kinds); }
    const conf = (a.confidence || []).filter(c => ['high', 'medium', 'low', 'very low'].includes(c));
    if (conf.length) { where.push(`e.confidence IN (${conf.map(() => '?').join(',')})`); args.push(...conf); }
    if (a.tag) { where.push('FIND_IN_SET(?, c.tags)'); args.push(str(a.tag, 40)); }
    const [rows] = await pool.query(`SELECT e.id, e.email, c.name FROM contact_emails e JOIN contacts c ON c.id = e.contact_id WHERE ${where.join(' AND ')} ORDER BY c.name, e.id`, args);
    for (const r of rows) if (!out.has(r.email)) out.set(r.email, { email: r.email, name: r.name, contact_email_id: r.id });
  }
  if (src === 'subscribers' || src === 'both') {
    const [rows] = await pool.query('SELECT email, name FROM newsletter_subscribers WHERE unsubscribed_at IS NULL ORDER BY id');
    for (const r of rows) if (!out.has(r.email)) out.set(r.email, { email: r.email, name: r.name, contact_email_id: null });
  }
  const [sup] = await pool.query(SUPPRESSED);
  for (const s of sup) out.delete(s.email);
  return [...out.values()];
}

// ---- sending loop (in-process; state lives in the DB) ----------------------
const running = new Set();

async function runBlast(id) {
  if (running.has(id)) return;
  running.add(id);
  try {
    for (;;) {
      const [[b]] = await pool.query('SELECT status FROM blasts WHERE id = ?', [id]);
      if (!b || b.status !== 'sending') break;
      const [[r]] = await pool.query("SELECT * FROM blast_recipients WHERE blast_id = ? AND status = 'queued' ORDER BY id LIMIT 1", [id]);
      if (!r) { await pool.execute("UPDATE blasts SET status = 'done', finished_at = NOW() WHERE id = ?", [id]); break; }
      const [[blast]] = await pool.query('SELECT * FROM blasts WHERE id = ?', [id]);
      try {
        const m = render(blast, r);
        const mid = await deliver({ to: r.email, subject: m.subject, text: m.text, html: m.html,
          headers: { 'List-Unsubscribe': `<${m.unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
        await pool.execute("UPDATE blast_recipients SET status = 'sent', message_id = ?, sent_at = NOW() WHERE id = ?", [mid || null, r.id]);
        await pool.execute('UPDATE blasts SET sent = sent + 1 WHERE id = ?', [id]);
        if (r.contact_email_id) await pool.execute("UPDATE contact_emails SET status = 'sent', status_at = NOW() WHERE id = ? AND status = 'unverified'", [r.contact_email_id]);
      } catch (err) {
        const msg = str(err.message, 300);
        await pool.execute("UPDATE blast_recipients SET status = 'failed', error = ? WHERE id = ?", [msg, r.id]);
        await pool.execute('UPDATE blasts SET failed = failed + 1 WHERE id = ?', [id]);
        // Throttling from SES: back off rather than burn the queue.
        if (/throttl|rate exceeded|Too many/i.test(msg)) await new Promise(res => setTimeout(res, 5000));
      }
      await new Promise(res => setTimeout(res, SEND_INTERVAL_MS));
    }
  } finally { running.delete(id); }
}

// Resume anything left 'sending' after a restart.
setTimeout(async () => {
  try { const [rows] = await pool.query("SELECT id FROM blasts WHERE status = 'sending'"); rows.forEach(r => runBlast(r.id)); } catch {}
}, 3000);

// ---- admin routes -------------------------------------------------------------
const fields = (b) => ({ subject: str(b.subject, 200), preheader: str(b.preheader, 200), body: str(b.body, 50000), image: str(b.image, 120) || null });

admin.get('/blasts', async (req, res, next) => {
  try { const [rows] = await pool.query('SELECT id, subject, status, total, sent, failed, created_at, started_at, finished_at FROM blasts ORDER BY id DESC'); res.json({ blasts: rows }); }
  catch (err) { next(err); }
});

admin.post('/blasts/preview', (req, res) => {
  const b = fields(req.body || {});
  const m = render(b, { email: req.user.email || 'you@example.com', name: req.user.name || 'Sample Name' });
  res.json({ subject: m.subject, html: m.html, text: m.text });
});

admin.post('/blasts/audience', async (req, res, next) => {
  try { const list = await buildAudience(req.body?.audience || {}); res.json({ count: list.length, sample: list.slice(0, 12) }); }
  catch (err) { next(err); }
});

admin.post('/blasts', async (req, res, next) => {
  try {
    const b = fields(req.body || {});
    if (!b.subject || !b.body) return res.status(400).json({ error: 'Subject and body required' });
    const [r] = await pool.execute('INSERT INTO blasts (subject, preheader, body, image, audience, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [b.subject, b.preheader, b.body, b.image, JSON.stringify(req.body?.audience || { source: 'crm' }), req.user.id || null]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

admin.get('/blasts/:id', async (req, res, next) => {
  try {
    const [[b]] = await pool.query('SELECT * FROM blasts WHERE id = ?', [Number(req.params.id)]);
    if (!b) return res.status(404).json({ error: 'Not found' });
    const [st] = await pool.query('SELECT status, COUNT(*) AS n FROM blast_recipients WHERE blast_id = ? GROUP BY status', [b.id]);
    res.json({ ...b, audience: typeof b.audience === 'string' ? JSON.parse(b.audience) : b.audience, byStatus: Object.fromEntries(st.map(r => [r.status, r.n])), backend: backendName });
  } catch (err) { next(err); }
});

admin.patch('/blasts/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[b]] = await pool.query('SELECT status FROM blasts WHERE id = ?', [id]);
    if (!b) return res.status(404).json({ error: 'Not found' });
    if (b.status !== 'draft') return res.status(400).json({ error: 'Only drafts can be edited' });
    const f = fields(req.body || {});
    await pool.execute('UPDATE blasts SET subject = ?, preheader = ?, body = ?, image = ?, audience = ? WHERE id = ?',
      [f.subject, f.preheader, f.body, f.image, JSON.stringify(req.body?.audience || { source: 'crm' }), id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

admin.delete('/blasts/:id', async (req, res, next) => {
  try {
    const [r] = await pool.execute("DELETE FROM blasts WHERE id = ? AND status IN ('draft','done','failed')", [Number(req.params.id)]);
    res.json({ deleted: r.affectedRows });
  } catch (err) { next(err); }
});

admin.post('/blasts/:id/test', async (req, res, next) => {
  try {
    const [[b]] = await pool.query('SELECT * FROM blasts WHERE id = ?', [Number(req.params.id)]);
    if (!b) return res.status(404).json({ error: 'Not found' });
    const to = email(req.body?.to) || req.user.email;
    if (!to || to === 'token') return res.status(400).json({ error: 'No address to send the test to' });
    const m = render(b, { email: to, name: req.user.name || 'Test' });
    await deliver({ to, subject: `[TEST] ${m.subject}`, text: m.text, html: m.html });
    res.json({ ok: true, to });
  } catch (err) { res.status(502).json({ error: err.message }); }
});

admin.post('/blasts/:id/send', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[b]] = await pool.query('SELECT * FROM blasts WHERE id = ?', [id]);
    if (!b) return res.status(404).json({ error: 'Not found' });
    if (b.status !== 'draft') return res.status(400).json({ error: 'Already sent or sending' });
    if (backendName === 'none') return res.status(400).json({ error: 'No mail backend configured' });
    const list = await buildAudience(typeof b.audience === 'string' ? JSON.parse(b.audience) : b.audience);
    if (!list.length) return res.status(400).json({ error: 'Audience is empty' });
    for (const r of list) await pool.execute('INSERT IGNORE INTO blast_recipients (blast_id, email, name, contact_email_id) VALUES (?, ?, ?, ?)', [id, r.email, r.name || '', r.contact_email_id]);
    await pool.execute("UPDATE blasts SET status = 'sending', total = ?, started_at = NOW() WHERE id = ?", [list.length, id]);
    runBlast(id);
    res.json({ ok: true, total: list.length });
  } catch (err) { next(err); }
});

admin.post('/blasts/:id/pause', async (req, res, next) => {
  try { await pool.execute("UPDATE blasts SET status = 'paused' WHERE id = ? AND status = 'sending'", [Number(req.params.id)]); res.json({ ok: true }); }
  catch (err) { next(err); }
});
admin.post('/blasts/:id/resume', async (req, res, next) => {
  try { const id = Number(req.params.id); await pool.execute("UPDATE blasts SET status = 'sending' WHERE id = ? AND status = 'paused'", [id]); runBlast(id); res.json({ ok: true }); }
  catch (err) { next(err); }
});

admin.get('/blasts/:id/recipients', async (req, res, next) => {
  try {
    const args = [Number(req.params.id)]; let w = '';
    if (req.query.status) { w = ' AND status = ?'; args.push(str(req.query.status, 20)); }
    const [rows] = await pool.query(`SELECT id, email, name, status, error, sent_at FROM blast_recipients WHERE blast_id = ?${w} ORDER BY id LIMIT 5000`, args);
    res.json({ rows });
  } catch (err) { next(err); }
});

// ---- public: unsubscribe ------------------------------------------------------
async function unsubscribe(e) {
  await pool.execute("UPDATE contact_emails SET status = 'unsubscribed', status_at = NOW(), status_note = 'via link' WHERE email = ?", [e]);
  await pool.execute('UPDATE newsletter_subscribers SET unsubscribed_at = NOW() WHERE email = ? AND unsubscribed_at IS NULL', [e]);
}

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title>
<style>body{font-family:Georgia,serif;background:#f6f1e7;color:#1a1f2b;margin:0;padding:40px 16px}.c{max-width:520px;margin:0 auto;background:#fffdf8;border-top:5px solid #d9422b;padding:28px 32px}h1{font-family:Arial,sans-serif;text-transform:uppercase;font-size:22px;color:#0b1f3a;margin:0 0 12px}a{color:#1d4278}.s{font-size:13px;color:#7a8190}</style></head>
<body><div class="c"><h1>${title}</h1>${body}<p class="s">Tug Comanche Historical Rescue Foundation · <a href="https://tug202.org">tug202.org</a></p></div></body></html>`;

pub.get('/unsubscribe', async (req, res, next) => {
  try {
    const e = verifyUnsubToken(req.query.t);
    if (!e) return res.status(400).type('html').send(page('Link not valid', '<p>This unsubscribe link is malformed. Reply to any of our emails with "unsubscribe" and we will remove you by hand.</p>'));
    await unsubscribe(e);
    res.type('html').send(page('You are unsubscribed', `<p><strong>${e.replace(/</g, '&lt;')}</strong> will not receive further mailings from us.</p><p>Changed your mind? You can <a href="https://tug202.org/support">sign up again</a> any time.</p>`));
  } catch (err) { next(err); }
});
// RFC 8058 one-click (mail clients POST here).
pub.post('/unsubscribe', express.urlencoded({ extended: false }), async (req, res, next) => {
  try { const e = verifyUnsubToken(req.query.t); if (e) await unsubscribe(e); res.status(200).end(); } catch (err) { next(err); }
});

// ---- public: SES events via SNS ------------------------------------------------
pub.post('/ses/events', express.text({ type: '*/*', limit: '256kb' }), async (req, res, next) => {
  try {
    let msg; try { msg = JSON.parse(req.body); } catch { return res.status(400).end(); }
    // Verify the SNS signature so nobody can forge bounces.
    const MessageValidator = require('sns-validator');
    await new Promise((ok, bad) => new MessageValidator().validate(msg, err => err ? bad(err) : ok()));

    if (msg.Type === 'SubscriptionConfirmation') {
      if (!/^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\//.test(msg.SubscribeURL)) return res.status(400).end();
      https.get(msg.SubscribeURL, r => r.resume()).on('error', () => {});
      console.log('[ses] SNS subscription confirmed');
      return res.status(200).end();
    }
    if (msg.Type !== 'Notification') return res.status(200).end();

    let ev; try { ev = JSON.parse(msg.Message); } catch { return res.status(200).end(); }
    const type = (ev.eventType || ev.notificationType || '').toLowerCase();
    const mid = ev.mail?.messageId || null;
    const recips = type === 'bounce' ? (ev.bounce?.bouncedRecipients || []).map(r => r.emailAddress)
      : type === 'complaint' ? (ev.complaint?.complainedRecipients || []).map(r => r.emailAddress)
      : (ev.mail?.destination || []);
    for (const raw of recips) {
      const e = String(raw).toLowerCase();
      await pool.execute('INSERT INTO ses_events (event_type, message_id, email, detail) VALUES (?, ?, ?, ?)', [type, mid, e, JSON.stringify(ev).slice(0, 60000)]);
      if (type === 'bounce' && (ev.bounce?.bounceType === 'Permanent' || /Undetermined/i.test(ev.bounce?.bounceType || ''))) {
        await pool.execute("UPDATE contact_emails SET status = 'bounced', status_at = NOW(), status_note = ? WHERE email = ?", [str(`SES ${ev.bounce?.bounceSubType || ''}`, 300), e]);
        await pool.execute("UPDATE blast_recipients SET status = 'bounced' WHERE email = ? AND status = 'sent'", [e]);
      } else if (type === 'complaint') {
        await unsubscribe(e);
        await pool.execute("UPDATE contact_emails SET status_note = 'complaint' WHERE email = ?", [e]);
        await pool.execute("UPDATE blast_recipients SET status = 'complained' WHERE email = ? AND status = 'sent'", [e]);
      }
    }
    res.status(200).end();
  } catch (err) { console.error('[ses:events]', err.message); res.status(400).end(); }
});

module.exports = { admin, pub };
