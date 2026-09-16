const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const contactsRouter = require('./contacts');

// Read-only export of form submissions, protected by a static bearer token
// from .env. Enough for a board secretary to pull the volunteer list with
// curl; a real admin UI with sessions can replace this later.
//
//   curl -H "Authorization: Bearer $ADMIN_TOKEN" https://tug202.org/api/admin/volunteers

const router = express.Router();

function requireToken(req, res, next) {
  const expected = process.env.ADMIN_TOKEN || '';
  const header = req.get('authorization') || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!expected || /replace-me/.test(expected)) {
    return res.status(503).json({ error: 'ADMIN_TOKEN is not configured.' });
  }
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireToken);
router.use(contactsRouter);

router.get('/contacts', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, created_at, name, email, topic, message FROM contact_messages ORDER BY id DESC LIMIT 500'
    );
    res.json({ rows });
  } catch (err) { next(err); }
});

router.get('/volunteers', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, created_at, name, email, phone, interests, experience, availability FROM volunteer_signups ORDER BY id DESC LIMIT 500'
    );
    res.json({ rows });
  } catch (err) { next(err); }
});

router.get('/partners', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, created_at, org_name, contact_name, email, phone, purpose, headcount, location, dates, mode, duration, accessibility, equipment, resources FROM partner_inquiries ORDER BY id DESC LIMIT 500'
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

module.exports = router;
