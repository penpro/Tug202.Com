const express = require('express');
const pool = require('../db');
const contactsRouter = require('./contacts');
const { requireAuth, users: usersRouter } = require('../auth');
const newsAdminRouter = require('./newsAdmin');
const { admin: blastsAdmin } = require('./blasts');
const peopleRouter = require('./people');

// Everything under /api/admin needs a signed-in portal user (see auth.js).
// The static ADMIN_TOKEN bearer still works for curl scripts.

const router = express.Router();

router.use(requireAuth);
router.use(usersRouter);
router.use(newsAdminRouter);
router.use(blastsAdmin);
router.use(contactsRouter);
router.use(peopleRouter);

router.get('/contacts', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, created_at, handled_at, name, email, topic, message FROM contact_messages ORDER BY id DESC LIMIT 500'
    );
    res.json({ rows });
  } catch (err) { next(err); }
});

router.get('/volunteers', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, created_at, contacted_at AS handled_at, name, email, phone, interests, experience, availability FROM volunteer_signups ORDER BY id DESC LIMIT 500'
    );
    res.json({ rows });
  } catch (err) { next(err); }
});

router.get('/partners', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, created_at, handled_at, org_name, contact_name, email, phone, purpose, headcount, location, dates, mode, duration, accessibility, equipment, resources FROM partner_inquiries ORDER BY id DESC LIMIT 500'
    );
    res.json({ rows });
  } catch (err) { next(err); }
});

router.get('/subscribers', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, created_at, updated_at, email, name, pref_newsletter, pref_volunteer, pref_events, pref_reunions, note FROM newsletter_subscribers WHERE unsubscribed_at IS NULL ORDER BY id DESC LIMIT 5000'
    );
    res.json({ rows });
  } catch (err) { next(err); }
});

// Dashboard summary: counts + the latest few of everything.
router.get('/summary', async (req, res, next) => {
  try {
    const q = async (sql) => (await pool.query(sql))[0];
    const [[c], [v], [p], [s], [n], [ct]] = await Promise.all([
      q('SELECT COUNT(*) AS n, SUM(handled_at IS NULL) AS open FROM contact_messages'),
      q('SELECT COUNT(*) AS n, SUM(contacted_at IS NULL) AS open FROM volunteer_signups'),
      q('SELECT COUNT(*) AS n, SUM(handled_at IS NULL) AS open FROM partner_inquiries'),
      q('SELECT COUNT(*) AS n FROM newsletter_subscribers WHERE unsubscribed_at IS NULL'),
      q('SELECT COUNT(*) AS n FROM news_posts WHERE is_published = 1'),
      q('SELECT COUNT(*) AS n FROM contacts')
    ]);
    const recent = await q(`(SELECT 'contact' AS kind, id, created_at, name AS who, topic AS what FROM contact_messages)
      UNION ALL (SELECT 'volunteer', id, created_at, name, interests FROM volunteer_signups)
      UNION ALL (SELECT 'partner', id, created_at, org_name, LEFT(purpose, 80) FROM partner_inquiries)
      UNION ALL (SELECT 'subscriber', id, created_at, COALESCE(NULLIF(name,''), email), '' FROM newsletter_subscribers)
      ORDER BY created_at DESC LIMIT 15`);
    res.json({ contacts: c, volunteers: v, partners: p, subscribers: s, news: n, crm: ct, recent });
  } catch (err) { next(err); }
});

// Mark a submission handled / unhandled.
router.post('/handled', async (req, res, next) => {
  try {
    const { kind, id, handled } = req.body || {};
    const map = { contact: ['contact_messages', 'handled_at'], volunteer: ['volunteer_signups', 'contacted_at'], partner: ['partner_inquiries', 'handled_at'] };
    if (!map[kind]) return res.status(400).json({ error: 'bad kind' });
    const [t, col] = map[kind];
    await pool.execute(`UPDATE ${t} SET ${col} = ${handled === false ? 'NULL' : 'NOW()'} WHERE id = ?`, [Number(id)]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
