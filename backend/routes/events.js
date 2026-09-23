// The calendar: cruises and work days, their public sign-up pages, and the
// registrations that come back.
//
//   public:  GET  /api/event/:code          what the public page renders
//            GET  /api/event/:code.png      QR code pointing at that page
//            POST /api/event/:code/register sign up for it
//   admin:   GET/POST/PATCH /admin/events   the calendar
//            POST /admin/events/:id/news    turn it into a news post
//            POST /admin/events/:id/publish show or hide the public page
//
// A cruise and a work day are the same row with a different `kind`. Cruises
// carry boarding and departure times, a route, a suggested donation and
// whatever the sponsor sent us; work days carry what to bring and what we are
// trying to get done. Only cruises use check-in — that is a Coast Guard
// headcount, and nobody needs one to chip paint.

const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const pool = require('../db');
const { str, email } = require('../validate');
const { notify, deliverRaw, send } = require('../mailer');
const { upsertContact } = require('../crm');
const { manageUrl } = require('../mail-template');

const pub = express.Router();
const admin = express.Router();

const SITE = () => (process.env.APP_BASE_URL || 'https://tug202.org').replace(/\/$/, '');
const date = (v) => { const d = String(v || '').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null; };
const time = (v) => { const t = String(v || '').trim(); return /^\d{2}:\d{2}(:\d{2})?$/.test(t) ? t.slice(0, 5) : null; };
const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY3479';
const newCode = () => Array.from(crypto.randomBytes(8)).map(b => ALPHABET[b % ALPHABET.length]).join('');
const eventUrl = (code) => `${SITE()}/e/${code}`;

const PUBLIC_COLS = `id, kind, sail_date, end_date, boarding_at, depart_at, return_at, disembark_at,
  title, location, capacity, description, route, donation, donation_amount, donation_per,
  sponsor, sponsor_info, bring, goals, signup_code, published, status`;

// What the admin form may set. Times and dates are validated; everything else
// is trimmed text.
function fields(b) {
  const kind = b.kind === 'workday' ? 'workday' : 'cruise';
  return {
    kind,
    sail_date: date(b.sail_date),
    end_date: date(b.end_date),
    boarding_at: time(b.boarding_at),
    depart_at: time(b.depart_at),
    return_at: time(b.return_at),
    disembark_at: time(b.disembark_at),
    title: str(b.title, 160),
    location: str(b.location, 160),
    capacity: Math.max(0, Math.min(500, Number(b.capacity) || 0)),
    notes: str(b.notes, 600),
    description: str(b.description, 8000),
    route: kind === 'cruise' ? str(b.route, 800) : '',
    donation: kind === 'cruise' ? str(b.donation, 120) : '',
    donation_amount: kind === 'cruise' && Number(b.donation_amount) > 0 ? Number(b.donation_amount).toFixed(2) : null,
    donation_per: b.donation_per === 'party' ? 'party' : 'person',
    sponsor: kind === 'cruise' ? str(b.sponsor, 160) : '',
    sponsor_info: kind === 'cruise' ? str(b.sponsor_info, 8000) : '',
    bring: kind === 'workday' ? str(b.bring, 800) : '',
    goals: kind === 'workday' ? str(b.goals, 8000) : '',
    status: ['planned', 'boarding', 'underway', 'closed'].includes(b.status) ? b.status : 'planned'
  };
}

// ---- admin -----------------------------------------------------------------
admin.get('/events', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT s.*,
        (SELECT COUNT(*) FROM sailing_checkins c WHERE c.sailing_id = s.id) AS registered,
        (SELECT COALESCE(SUM(adults + minor_count), 0) FROM sailing_checkins c WHERE c.sailing_id = s.id AND c.checked_in_at IS NOT NULL AND c.checked_out_at IS NULL) AS aboard,
        (SELECT COALESCE(SUM(minor_count), 0) FROM sailing_checkins c WHERE c.sailing_id = s.id AND c.checked_in_at IS NOT NULL AND c.checked_out_at IS NULL) AS children,
        n.slug AS news_slug
      FROM sailings s LEFT JOIN news_posts n ON n.id = s.news_post_id
      ORDER BY s.sail_date DESC, s.id DESC LIMIT 300`);
    res.json({ rows });
  } catch (err) { next(err); }
});

admin.post('/events', async (req, res, next) => {
  try {
    const f = fields(req.body || {});
    if (!f.sail_date) return res.status(400).json({ error: 'A date is required' });
    const cols = Object.keys(f);
    const [r] = await pool.execute(
      `INSERT INTO sailings (${cols.join(', ')}, signup_code, created_by) VALUES (${cols.map(() => '?').join(', ')}, ?, ?)`,
      [...cols.map(k => f[k]), newCode(), req.user.id || null]);
    const [[row]] = await pool.query('SELECT * FROM sailings WHERE id = ?', [r.insertId]);
    res.status(201).json({ row });
  } catch (err) { next(err); }
});

admin.patch('/events/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[cur]] = await pool.query('SELECT * FROM sailings WHERE id = ?', [id]);
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const f = fields({ ...cur, ...req.body });
    if (!f.sail_date) return res.status(400).json({ error: 'A date is required' });
    const sets = Object.keys(f).map(k => `${k} = ?`).join(', ');
    await pool.execute(`UPDATE sailings SET ${sets} WHERE id = ?`, [...Object.values(f), id]);
    const [[row]] = await pool.query('SELECT * FROM sailings WHERE id = ?', [id]);
    res.json({ row });
  } catch (err) { next(err); }
});

admin.post('/events/:id/publish', async (req, res, next) => {
  try {
    const on = req.body?.published === false ? 0 : 1;
    await pool.execute('UPDATE sailings SET published = ? WHERE id = ?', [on, Number(req.params.id)]);
    res.json({ ok: true, published: !!on });
  } catch (err) { next(err); }
});

admin.delete('/events/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM sailing_checkins WHERE sailing_id = ?', [id]);
    if (n) return res.status(400).json({ error: `${n} people are signed up — unpublish it instead of deleting it.` });
    await pool.execute('DELETE FROM sailings WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Who signed up (both kinds). Cruises also have the check-in view.
admin.get('/events/:id/registrations', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, w.pass_code, w.phone FROM sailing_checkins c LEFT JOIN waivers w ON w.id = c.waiver_id
       WHERE c.sailing_id = ? ORDER BY c.registered_at IS NULL, c.registered_at, c.name`, [Number(req.params.id)]);
    res.json({ rows });
  } catch (err) { next(err); }
});

// The QR poster: a PNG of the public sign-up link, big enough to print.
admin.get('/events/:id/qr.png', async (req, res, next) => {
  try {
    const [[row]] = await pool.query('SELECT signup_code FROM sailings WHERE id = ?', [Number(req.params.id)]);
    if (!row) return res.status(404).send('Not found');
    const png = await QRCode.toBuffer(eventUrl(row.signup_code), { width: 1200, margin: 2 });
    res.type('image/png').send(png);
  } catch (err) { next(err); }
});

// ---- turn an event into a news post ----------------------------------------
const pretty = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const prettyTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'p.m.' : 'a.m.';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${m ? ':' + String(m).padStart(2, '0') : ''} ${ampm}`;
};

// The news body, written from the event. Deliberately plain prose with a
// schedule list — it reads like something a person wrote, not a form dump.
function newsBody(e) {
  const url = eventUrl(e.signup_code);
  const out = [];
  if (e.description) out.push(e.description.trim());

  if (e.kind === 'cruise') {
    const when = [
      e.boarding_at && `- **Boarding** ${prettyTime(e.boarding_at)}`,
      e.depart_at && `- **Departing** ${prettyTime(e.depart_at)}`,
      e.return_at && `- **Back alongside** ${prettyTime(e.return_at)}`,
      e.disembark_at && `- **Ashore by** ${prettyTime(e.disembark_at)}`
    ].filter(Boolean);
    if (when.length) out.push(`**The day**\n\n${when.join('\n')}`);
    if (e.location) out.push(`**Where:** ${e.location}`);
    if (e.route) out.push(`**Proposed route:** ${e.route}`);
    if (e.donation) out.push(`**Suggested donation:** ${e.donation}\n\nComanche is not a charter vessel and carries no passengers for hire. Donations are voluntary, are never a condition of coming aboard, and go straight into fuel, moorage and upkeep.`);
    if (e.capacity) out.push(`Space is limited to ${e.capacity} aboard, so sign up early.`);
    out.push(`**[Sign up for this cruise](${url})** — you will sign the boarding waiver once and get a QR boarding pass by email. Show it at the brow and you walk straight on.`);
  } else {
    if (e.goals) out.push(`**What we are trying to get done**\n\n${e.goals.trim()}`);
    if (e.bring) out.push(`**What to bring**\n\n${e.bring.trim()}`);
    if (e.location) out.push(`**Where:** ${e.location}`);
    out.push(`No experience needed — we teach. **[Sign up for this work day](${url})** so we know how many hands to plan for and can tell you if anything changes.`);
  }
  if (e.sponsor_info) out.push(`**From ${e.sponsor || 'our partner'}**\n\n${e.sponsor_info.trim()}`);
  return out.join('\n\n');
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 110);

admin.post('/events/:id/news', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[e]] = await pool.query('SELECT * FROM sailings WHERE id = ?', [id]);
    if (!e) return res.status(404).json({ error: 'Not found' });

    const title = str(req.body?.title, 200) || e.title ||
      (e.kind === 'cruise' ? `Cruise on ${pretty(e.sail_date)}` : `Work day on ${pretty(e.sail_date)}`);
    const body = str(req.body?.body, 60000) || newsBody(e);
    const publishedOn = date(req.body?.published_on) || new Date().toISOString().slice(0, 10);
    const isPublished = req.body?.is_published === false ? 0 : 1;

    // Updating the post we already made for this event, rather than making a second one.
    if (e.news_post_id) {
      const [[existing]] = await pool.query('SELECT id FROM news_posts WHERE id = ?', [e.news_post_id]);
      if (existing) {
        await pool.execute('UPDATE news_posts SET title = ?, body = ?, is_published = ? WHERE id = ?', [title, body, isPublished, existing.id]);
        const [[post]] = await pool.query('SELECT * FROM news_posts WHERE id = ?', [existing.id]);
        return res.json({ post, updated: true });
      }
    }

    let slug = slugify(`${e.sail_date.toISOString ? e.sail_date.toISOString().slice(0, 10) : String(e.sail_date).slice(0, 10)}-${title}`);
    for (let i = 2; ; i++) {
      const [[clash]] = await pool.query('SELECT id FROM news_posts WHERE slug = ?', [slug]);
      if (!clash) break;
      slug = slugify(`${slug}-${i}`);
      if (i > 20) break;
    }
    const [r] = await pool.execute(
      'INSERT INTO news_posts (slug, published_on, title, body, is_published) VALUES (?, ?, ?, ?, ?)',
      [slug, publishedOn, title, body, isPublished]);
    await pool.execute('UPDATE sailings SET news_post_id = ?, published = 1 WHERE id = ?', [r.insertId, id]);
    const [[post]] = await pool.query('SELECT * FROM news_posts WHERE id = ?', [r.insertId]);
    res.status(201).json({ post });
  } catch (err) { next(err); }
});

// Preview the generated copy before committing to it.
admin.get('/events/:id/news-draft', async (req, res, next) => {
  try {
    const [[e]] = await pool.query('SELECT * FROM sailings WHERE id = ?', [Number(req.params.id)]);
    if (!e) return res.status(404).json({ error: 'Not found' });
    const d = String(e.sail_date).slice(0, 10);
    res.json({
      title: e.title || (e.kind === 'cruise' ? `Cruise on ${pretty(d)}` : `Work day on ${pretty(d)}`),
      body: newsBody({ ...e, sail_date: d }),
      existing: e.news_post_id || null
    });
  } catch (err) { next(err); }
});

// ---- public -----------------------------------------------------------------
pub.get('/event/:code.png', async (req, res, next) => {
  try {
    const png = await QRCode.toBuffer(eventUrl(str(req.params.code, 8).toUpperCase()), { width: 800, margin: 2 });
    res.type('image/png').setHeader('Cache-Control', 'public, max-age=3600').send(png);
  } catch (err) { next(err); }
});

pub.get('/event/:code', async (req, res, next) => {
  try {
    const [[e]] = await pool.query(`SELECT ${PUBLIC_COLS} FROM sailings WHERE signup_code = ?`, [str(req.params.code, 8).toUpperCase()]);
    if (!e || !e.published) return res.status(404).json({ error: 'That event is not open for sign-ups.' });
    const [[{ n }]] = await pool.query(
      'SELECT COALESCE(SUM(adults + minor_count), 0) AS n FROM sailing_checkins WHERE sailing_id = ?', [e.id]);
    res.json({ event: e, signedUp: Number(n), full: e.capacity > 0 && Number(n) >= e.capacity });
  } catch (err) { next(err); }
});

// Sign up. Known address → we mail a link rather than showing anyone's record;
// new address → a CRM record is created. Cruises then need a waiver, and the
// email carries that link; work days are done at this point.
pub.post('/event/:code/register', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (str(b.website, 100)) return res.json({ ok: true });                 // honeypot
    const [[e]] = await pool.query('SELECT * FROM sailings WHERE signup_code = ?', [str(req.params.code, 8).toUpperCase()]);
    if (!e || !e.published) return res.status(404).json({ error: 'That event is not open for sign-ups.' });

    const name = str(b.name, 160);
    const addr = email(b.email);
    if (!name || !addr) return res.status(400).json({ error: 'Your name and a valid email address are required.' });

    const adults = Math.max(1, Math.min(20, Number(b.adults) || 1));
    const minors = Math.max(0, Math.min(20, Number(b.minor_count) || 0));
    if (e.capacity > 0) {
      const [[{ n }]] = await pool.query('SELECT COALESCE(SUM(adults + minor_count), 0) AS n FROM sailing_checkins WHERE sailing_id = ?', [e.id]);
      if (Number(n) + adults + minors > e.capacity) {
        return res.status(400).json({ error: `Sorry — only ${Math.max(0, e.capacity - Number(n))} place(s) left. Write to us and we will put you on the waiting list.` });
      }
    }

    // What we suggested, and whether they kept the box ticked. This is an
    // intention to give, never a payment — Givebutter is the record of money.
    const pledged = !!b.pledge;
    const per = Number(e.donation_amount) || 0;
    const suggested = per > 0 ? (e.donation_per === 'party' ? per : per * adults) : 0;
    // They may type their own figure over the suggestion — more often up than
    // down, in our experience, so never quietly clamp it back to the default.
    const typed = Number(b.pledge_amount);
    const chosen = Number.isFinite(typed) && typed > 0 ? Math.min(typed, 100000) : suggested;
    const pledgeAmount = pledged && chosen > 0 ? chosen.toFixed(2) : null;

    const known = (await pool.query(
      'SELECT 1 AS hit FROM contact_emails WHERE email = ? UNION SELECT 1 FROM newsletter_subscribers WHERE email = ? LIMIT 1', [addr, addr]))[0][0];

    await upsertContact({
      email: addr, name, phone: str(b.phone, 40), source: e.kind === 'cruise' ? 'cruise' : 'workday',
      sourceRef: e.title || String(e.id), tags: e.kind === 'cruise' ? 'cruise' : 'volunteer', optin: b.optin ? 1 : 0,
      note: `Signed up for ${e.title || e.kind} on ${String(e.sail_date).slice(0, 10)}`,
      statusNote: 'signed up for an event'
    }, b.optin ? undefined : { prefs: { newsletter: false, volunteer: false, events: false, reunions: false } }).catch(() => {});

    // An existing waiver that is still in date means no second signing.
    const [[waiver]] = await pool.query(
      "SELECT * FROM waivers WHERE email = ? AND revoked_at IS NULL AND (expires_on IS NULL OR expires_on >= CURDATE()) ORDER BY id DESC LIMIT 1", [addr]);

    const [existing] = await pool.query('SELECT id FROM sailing_checkins WHERE sailing_id = ? AND email = ?', [e.id, addr]);
    if (existing.length) {
      await pool.execute('UPDATE sailing_checkins SET name = ?, adults = ?, minor_count = ?, party_size = ?, bringing = ?, skills = ?, pledged = ?, pledge_amount = ?, waiver_id = COALESCE(waiver_id, ?) WHERE id = ?',
        [name, adults, minors, adults + minors, str(b.bringing, 300), str(b.skills, 300), pledged ? 1 : 0, pledgeAmount, waiver?.id || null, existing[0].id]);
    } else {
      await pool.execute(
        `INSERT INTO sailing_checkins (sailing_id, waiver_id, name, email, adults, minor_count, party_size, role, registered_at, method, bringing, skills, pledged, pledge_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'prereg', ?, ?, ?, ?)`,
        [e.id, waiver?.id || null, name, addr, adults, minors, adults + minors,
          e.kind === 'workday' ? 'volunteer' : 'guest', str(b.bringing, 300), str(b.skills, 300), pledged ? 1 : 0, pledgeAmount]);
    }

    const needsWaiver = e.kind === 'cruise' && !waiver;
    const waiverLink = `${SITE()}/waiver?sailing=${e.id}`;
    const dateStr = pretty(String(e.sail_date).slice(0, 10));

    try {
      await deliverRaw({
        to: addr,
        subject: `You're signed up: ${e.title || (e.kind === 'cruise' ? 'Comanche cruise' : 'Comanche work day')} — ${dateStr}`,
        text: confirmText(e, { name, adults, minors, dateStr, needsWaiver, waiverLink, waiver, known, addr }),
        html: confirmHtml(e, { name, adults, minors, dateStr, needsWaiver, waiverLink, waiver, known, addr })
      });
    } catch (err) { console.error('[event mail]', err.message); }

    notify(`[tug202.org] ${e.kind === 'cruise' ? 'Cruise' : 'Work day'} sign-up — ${name}`,
      `${name} <${addr}> signed up for ${e.title || e.kind} on ${dateStr}.\n` +
      `${adults} adult(s)${minors ? `, ${minors} child(ren)` : ''}. ${needsWaiver ? 'Still needs a waiver.' : 'Waiver on file.'}\n` +
      (b.bringing ? `Bringing: ${str(b.bringing, 300)}\n` : '') + (b.skills ? `Skills: ${str(b.skills, 300)}\n` : ''), addr);

    res.json({
      ok: true, known: !!known, needsWaiver,
      pass_code: waiver?.pass_code || null,
      pledge_amount: pledgeAmount,
      message: needsWaiver
        ? 'You’re on the list. Check your email — there is one more step: sign the boarding waiver and we’ll send your QR boarding pass.'
        : e.kind === 'cruise'
          ? 'You’re on the list, and your waiver is already on file. Your boarding pass is in the email we just sent.'
          : 'You’re on the list. We’ve emailed you the details — thank you, we can use the hands.'
    });
  } catch (err) { next(err); }
});

function confirmText(e, c) {
  const L = [`${c.name},`, ''];
  L.push(`You are signed up for ${e.title || (e.kind === 'cruise' ? 'a cruise aboard Comanche' : 'a work day aboard Comanche')} on ${c.dateStr}.`);
  L.push('');
  if (e.kind === 'cruise') {
    if (e.boarding_at) L.push(`Boarding: ${prettyTime(e.boarding_at)}`);
    if (e.depart_at) L.push(`Departing: ${prettyTime(e.depart_at)}`);
    if (e.return_at) L.push(`Back alongside: ${prettyTime(e.return_at)}`);
    if (e.disembark_at) L.push(`Ashore by: ${prettyTime(e.disembark_at)}`);
    if (e.location) L.push(`Where: ${e.location}`);
    if (e.route) L.push(`Route: ${e.route}`);
    if (e.donation) L.push(`Suggested donation: ${e.donation} (voluntary — never a condition of coming aboard)`);
    L.push('');
    L.push(c.needsWaiver
      ? `ONE MORE STEP: sign the boarding waiver and we will email your QR boarding pass.\n${c.waiverLink}`
      : `Your boarding pass: ${SITE()}/pass/${c.waiver.pass_code}  (code ${c.waiver.pass_code})`);
  } else {
    if (e.goals) L.push(`What we are trying to get done:\n${e.goals}`);
    if (e.bring) L.push(`\nWhat to bring:\n${e.bring}`);
    if (e.location) L.push(`\nWhere: ${e.location}`);
  }
  L.push('', `Party: ${c.adults} adult(s)${c.minors ? `, ${c.minors} child(ren)` : ''}.`);
  if (c.known) L.push('', `We already had you in our records. Check or correct your details here: ${manageUrl(c.addr)}`);
  L.push('', 'If your plans change, reply to this email so we can free up the place.', '', '— The crew of Comanche', 'tug202.org');
  return L.join('\n');
}

function confirmHtml(e, c) {
  const site = SITE();
  const rows = e.kind === 'cruise'
    ? [['Boarding', prettyTime(e.boarding_at)], ['Departing', prettyTime(e.depart_at)],
      ['Back alongside', prettyTime(e.return_at)], ['Ashore by', prettyTime(e.disembark_at)],
      ['Where', e.location], ['Route', e.route], ['Suggested donation', e.donation]]
    : [['Where', e.location], ['What to bring', e.bring]];
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const list = rows.filter(([, v]) => v).map(([k, v]) => `<tr>
    <td style="padding:8px 14px;font-family:Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#7a8190;border-bottom:1px solid #f0ebe0;width:40%">${esc(k)}</td>
    <td style="padding:8px 14px;font-family:Georgia,serif;font-size:15px;color:#1a1f2b;border-bottom:1px solid #f0ebe0"><strong>${esc(v)}</strong></td></tr>`).join('');

  const cta = e.kind === 'cruise'
    ? (c.needsWaiver
      ? `<tr><td align="center" style="padding:8px 28px 22px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#d9422b;border-radius:4px">
            <a href="${c.waiverLink}" style="display:inline-block;padding:15px 30px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;letter-spacing:.05em;text-transform:uppercase;color:#fff;text-decoration:none">Sign the waiver &amp; get your pass</a>
          </td></tr></table>
          <div style="padding-top:8px;font-family:Arial,sans-serif;font-size:12px;color:#7a8190">One signature covers you for the whole season.</div>
        </td></tr>`
      : `<tr><td align="center" style="padding:8px 28px 22px">
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#7a8190;padding-bottom:8px">Your boarding pass &mdash; show it at the brow</div>
          <img src="${site}/api/pass/${c.waiver.pass_code}.png" width="190" height="190" alt="Boarding pass QR code" style="display:block;margin:0 auto;border:8px solid #fff;outline:1px solid #e6e0d3">
          <div style="font-family:'Courier New',monospace;font-size:24px;letter-spacing:.14em;color:#0b1f3a;padding-top:10px"><strong>${esc(c.waiver.pass_code)}</strong></div>
        </td></tr>`)
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>You are signed up</title></head>
<body style="margin:0;padding:0;background:#ece5d6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece5d6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fffdf8;border-top:5px solid #d9422b">
  <tr><td style="background:#0b1f3a;padding:18px 28px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:14px"><img src="${site}/images/crest.png" width="48" height="48" alt="" style="display:block;border:0"></td>
      <td style="font-family:Arial,sans-serif;color:#fff;font-size:18px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;line-height:1.1">You&rsquo;re signed up<br><span style="font-size:11px;font-weight:normal;letter-spacing:.12em;color:#c9a44c">Tug Comanche &middot; ATA-202</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 28px 8px;font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#1a1f2b">
    <p style="margin:0 0 10px">${esc(c.name)},</p>
    <p style="margin:0 0 14px">You are on the list for <strong>${esc(e.title || (e.kind === 'cruise' ? 'a cruise aboard Comanche' : 'a work day aboard Comanche'))}</strong> on <strong>${esc(c.dateStr)}</strong>.</p>
  </td></tr>
  ${list ? `<tr><td style="padding:0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e0d3;background:#fff">${list}</table></td></tr>` : ''}
  ${e.kind === 'workday' && e.goals ? `<tr><td style="padding:16px 28px 0;font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#1a1f2b"><p style="margin:0 0 6px"><strong>What we&rsquo;re trying to get done</strong></p><p style="margin:0">${esc(e.goals).replace(/\n/g, '<br>')}</p></td></tr>` : ''}
  <tr><td style="padding:16px 28px 4px;font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#1a1f2b">
    <p style="margin:0">Party: <strong>${c.adults} adult${c.adults === 1 ? '' : 's'}${c.minors ? `, ${c.minors} child${c.minors === 1 ? '' : 'ren'}` : ''}</strong>.</p>
  </td></tr>
  ${cta}
  ${e.donation && e.kind === 'cruise' ? `<tr><td style="padding:0 28px 14px;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#7a8190">Comanche is not a charter vessel and carries no passengers for hire. Donations are voluntary, are never a condition of coming aboard, and go into fuel, moorage and upkeep.</td></tr>` : ''}
  ${c.known ? `<tr><td style="padding:0 28px 14px;font-family:Georgia,serif;font-size:14px;color:#1a1f2b">We already had you in our records &mdash; <a href="${manageUrl(c.addr)}" style="color:#1d4278">check or correct your details</a>.</td></tr>` : ''}
  <tr><td style="padding:8px 28px 24px;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#7a8190;border-top:1px solid #e6e0d3">
    <p style="margin:14px 0 8px">If your plans change, reply to this email so we can free up the place.</p>
    <p style="margin:0">Tug Comanche Historical Rescue Foundation &middot; <a href="${site}" style="color:#7a8190">tug202.org</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

module.exports = { pub, admin, eventUrl };
