// Waivers, boarding passes, sailings and who is actually on board.
//
//   public:  GET  /api/waiver-text            the agreement, for the form
//            POST /api/waiver                 sign it (website or tablet kiosk)
//            GET  /api/pass/:code             a signed person's boarding pass
//            GET  /api/pass/:code.png         the QR image
//   admin:   GET/POST /admin/sailings         list, create
//            GET  /admin/sailings/:id         roster + head count
//            POST /admin/sailings/:id/checkin { code | waiver_id | name }
//            POST /admin/checkins/:id/out     someone went ashore
//            GET  /admin/waivers              everyone who has signed
//
// The head count is the point: at any moment, who is aboard for this sailing.

const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const pool = require('../db');
const { str, email } = require('../validate');
const { deliverRaw, notify } = require('../mailer');
const { upsertContact } = require('../crm');
const { page, esc } = require('../public-page');
const { manifestPdf } = require('../manifest-pdf');
const W = require('../waiver-text');

const pub = express.Router();
const admin = express.Router();

const SITE = () => (process.env.APP_BASE_URL || 'https://tug202.org').replace(/\/$/, '');
const date = (v) => { const d = String(v || '').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null; };
// No look-alike characters: these get read aloud across a noisy deck.
const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY3479';
const newCode = () => Array.from(crypto.randomBytes(8)).map(b => ALPHABET[b % ALPHABET.length]).join('');
// A waiver covers the rest of the calendar year.
const seasonEnd = () => `${new Date().getFullYear()}-12-31`;

const passUrl = (code) => `${SITE()}/pass/${code}`;

// ---- public ----------------------------------------------------------------
pub.get('/waiver-text', (req, res) => {
  res.json({ version: W.VERSION, title: W.TITLE, org: W.ORG, sections: W.SECTIONS, sha: W.sha() });
});

pub.post('/waiver', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (str(b.website, 100)) return res.json({ ok: true });            // honeypot
    const kiosk = b.kiosk === true || b.kiosk === 'true';

    const name = str(b.name, 160);
    const signed_name = str(b.signed_name, 160) || name;
    const addr = email(b.email);
    if (!name) return res.status(400).json({ error: 'Please give your full name.' });
    if (!kiosk && !addr) return res.status(400).json({ error: 'Please give an email address so we can send your boarding pass.' });
    if (!b.agree) return res.status(400).json({ error: 'You have to accept the agreement to come aboard.' });
    if (!str(b.signature, 200000) && !signed_name) return res.status(400).json({ error: 'Please sign, or type your name.' });

    const f = {
      name,
      email: addr || '',
      phone: str(b.phone, 40),
      address: str(b.address, 300),
      city: str(b.city, 120),
      dob: date(b.dob),
      emergency_name: str(b.emergency_name, 160),
      emergency_phone: str(b.emergency_phone, 40),
      minors: str(b.minors, 600),          // kept as a readable summary
      signed_name,
      signature: str(b.signature, 200000) || null,
      waiver_version: W.VERSION,
      waiver_sha: W.sha(),
      guardian: b.guardian ? 1 : 0,
      photo_ok: b.photo_ok === false || b.photo_ok === 'false' ? 0 : 1,
      optin: b.optin ? 1 : 0,
      method: kiosk ? 'kiosk' : 'online',
      ip: req.ip,
      user_agent: str(req.get('user-agent'), 300),
      pass_code: newCode(),
      expires_on: seasonEnd()
    };

    // Minors arrive as [{name, age}]; the old free-text field is still filled
    // in as a human-readable summary so nothing that reads it breaks.
    const minorList = (Array.isArray(b.minor_list) ? b.minor_list : [])
      .map(m => ({ name: str(m?.name, 160), age: m?.age === '' || m?.age === null || m?.age === undefined ? null : Math.max(0, Math.min(17, Number(m.age) || 0)) }))
      .filter(m => m.name)
      .slice(0, 20);
    if (minorList.length) f.minors = minorList.map(m => `${m.name}${m.age != null ? ' ' + m.age : ''}`).join(', ');
    if (f.guardian && !minorList.length && !f.minors) {
      return res.status(400).json({ error: 'Please name each person under 18 you are signing for.' });
    }

    const cols = Object.keys(f);
    const [ins] = await pool.execute(
      `INSERT INTO waivers (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, cols.map(k => f[k]));
    for (const m of minorList) {
      await pool.execute('INSERT INTO waiver_minors (waiver_id, name, age) VALUES (?, ?, ?)', [ins.insertId, m.name, m.age]);
    }

    // CRM: the person, and "waiver on file" against their record.
    let contactId = null;
    if (f.email) {
      const out = await upsertContact({
        email: f.email, name, phone: f.phone, city: f.city, address: f.address,
        source: kiosk ? 'kiosk' : 'waiver', sourceRef: 'liability waiver', tags: 'waiver', optin: f.optin,
        statusNote: 'signed the boarding waiver'
      }, f.optin ? undefined : { prefs: { newsletter: false, volunteer: false, events: false, reunions: false } }).catch(() => ({}));
      contactId = out.contactId || null;
      if (contactId) {
        await pool.execute('UPDATE waivers SET contact_id = ? WHERE id = ?', [contactId, ins.insertId]);
        await pool.execute('UPDATE contacts SET waiver_signed_on = CURDATE(), waiver_expires_on = ? WHERE id = ?', [f.expires_on, contactId]);
      }
    }

    // Pre-registering for a specific day puts them on that roster straight away.
    const sailingId = Number(b.sailing_id) || null;
    const adults = Math.max(1, Math.min(20, Number(b.adults) || 1));
    const minorCount = minorList.length;
    if (sailingId) {
      await pool.execute(
        `INSERT IGNORE INTO sailing_checkins (sailing_id, waiver_id, name, email, adults, minor_count, party_size, registered_at, method${kiosk ? ', checked_in_at' : ''})
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?${kiosk ? ', NOW()' : ''})`,
        [sailingId, ins.insertId, name, f.email, adults, minorCount, adults + minorCount, kiosk ? 'kiosk' : 'prereg']);
    }

    if (f.email && !kiosk) {
      try {
        const png = await QRCode.toBuffer(passUrl(f.pass_code), { width: 600, margin: 1 });
        await deliverRaw({
          to: f.email,
          subject: `Your boarding pass for Comanche — ${f.pass_code}`,
          text: `${name},\n\nThank you — your liability waiver is on file for the ${new Date().getFullYear()} season.\n\nYour boarding pass code is ${f.pass_code}. Show the attached QR code (or just give the code) to a crew member when you arrive and we will check you aboard.\n\nYour pass: ${passUrl(f.pass_code)}\n\nBefore you come:\n- Flat, closed-toe shoes with a grip. No sandals or heels.\n- Dress for the water, not the parking lot — it is colder and wetter aboard.\n- Comanche is a 1943 working vessel with steep ladders and high sills; she is not accessible.\n\n— The crew of Comanche\ntug202.org`,
          html: passEmailHtml(name, f.pass_code),
          attachments: [{ filename: `comanche-pass-${f.pass_code}.png`, content: png, contentType: 'image/png', cid: 'pass-qr' }]
        });
      } catch (err) { console.error('[pass mail]', err.message); }
    }

    notify(`[tug202.org] Waiver signed — ${name}`,
      `${name} <${f.email || 'no email'}> signed the waiver${kiosk ? ' at the kiosk' : ' online'}.\nPass code: ${f.pass_code}\n${f.minors ? 'Minors in their care: ' + f.minors + '\n' : ''}${sailingId ? 'Pre-registered for sailing #' + sailingId + '\n' : ''}`);

    res.json({ ok: true, pass_code: f.pass_code, pass_url: passUrl(f.pass_code), emailed: !!(f.email && !kiosk) });
  } catch (err) { next(err); }
});

function passEmailHtml(name, code) {
  const site = SITE();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Your boarding pass</title></head>
<body style="margin:0;padding:0;background:#ece5d6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece5d6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fffdf8;border-top:5px solid #d9422b">
  <tr><td style="background:#0b1f3a;padding:18px 28px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:14px"><img src="${site}/images/crest.png" width="48" height="48" alt="" style="display:block;border:0"></td>
      <td style="font-family:Arial,Helvetica,sans-serif;color:#fff;font-size:18px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;line-height:1.1">Boarding pass<br><span style="font-size:11px;font-weight:normal;letter-spacing:.12em;color:#c9a44c">Tug Comanche &middot; ATA-202</span></td>
    </tr></table>
  </td></tr>
  <tr><td align="center" style="padding:26px 28px 6px;font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#1a1f2b">
    <p style="margin:0 0 6px">${esc(name)}, your waiver is on file.</p>
    <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:13px;color:#7a8190">Show this to a crew member when you arrive.</p>
    <img src="cid:pass-qr" width="220" height="220" alt="Boarding pass QR code" style="display:block;border:8px solid #fff;outline:1px solid #e6e0d3">
    <p style="margin:14px 0 0;font-family:'Courier New',monospace;font-size:26px;letter-spacing:.14em;color:#0b1f3a"><strong>${esc(code)}</strong></p>
    <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#7a8190">Can't scan? Read the code out instead.</p>
  </td></tr>
  <tr><td style="padding:18px 28px 6px;font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#1a1f2b">
    <p style="margin:0 0 8px"><strong>Before you come:</strong></p>
    <ul style="margin:0 0 14px;padding-left:20px">
      <li style="margin-bottom:5px">Flat, closed-toe shoes with a grip &mdash; no sandals or heels.</li>
      <li style="margin-bottom:5px">Dress for the water, not the parking lot. It is colder and wetter aboard.</li>
      <li style="margin-bottom:5px">Comanche is a 1943 working vessel: steep ladders, high sills, no accessibility.</li>
    </ul>
  </td></tr>
  <tr><td style="padding:8px 28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#7a8190;border-top:1px solid #e6e0d3">
    <p style="margin:14px 0 0">Tug Comanche Historical Rescue Foundation &middot; <a href="${site}" style="color:#7a8190">tug202.org</a> &middot; your pass: <a href="${passUrl(code)}" style="color:#7a8190">${passUrl(code)}</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

// The pass itself — a page a phone can hold up at the brow.
pub.get('/pass/:code.png', async (req, res, next) => {
  try {
    const code = str(req.params.code, 8).toUpperCase();
    const png = await QRCode.toBuffer(passUrl(code), { width: 800, margin: 1 });
    res.type('image/png').setHeader('Cache-Control', 'private, max-age=600').send(png);
  } catch (err) { next(err); }
});

pub.get('/pass/:code', async (req, res, next) => {
  try {
    const code = str(req.params.code, 8).toUpperCase();
    const [[w]] = await pool.query('SELECT name, pass_code, expires_on, revoked_at FROM waivers WHERE pass_code = ?', [code]);
    if (!w || w.revoked_at) return res.status(404).type('html').send(page('Pass not found', '<p>We could not find that boarding pass. Sign the waiver again at <a href="https://tug202.org/waiver">tug202.org/waiver</a>, or see a crew member at the brow.</p>'));
    const expired = w.expires_on && new Date(w.expires_on) < new Date(new Date().toDateString());
    res.type('html').send(page('Boarding pass', `
      <p style="text-align:center;margin:0 0 4px">${esc(w.name)}</p>
      ${expired ? '<p class="ok" style="background:#fdecea;border-left-color:#b8321f">This pass has expired &mdash; sign again at the brow.</p>' : ''}
      <p style="text-align:center;margin:10px 0"><img src="/api/pass/${esc(code)}.png" alt="Boarding pass QR code" style="width:min(74vw,280px);height:auto;border:8px solid #fff;outline:1px solid #e6e0d3"></p>
      <p style="text-align:center;font-family:'Courier New',monospace;font-size:30px;letter-spacing:.14em;margin:6px 0 0">${esc(code)}</p>
      <p class="s" style="text-align:center">Show this to a crew member, or read the code out.</p>`));
  } catch (err) { next(err); }
});

// ---- admin: sailings -------------------------------------------------------
const ABOARD = 'checked_in_at IS NOT NULL AND checked_out_at IS NULL';

// The manifest, the way a boarding officer asks for it: passengers, crew,
// children — and the total souls that has to match a life-jacket count.
// Volunteers working the ship count as crew; a child of a crew member is still
// counted as a child.
function tally(roster) {
  const on = roster.filter(r => r.checked_in_at && !r.checked_out_at);
  const isCrew = (r) => r.role === 'crew' || r.role === 'volunteer';
  const t = {
    passengers: on.filter(r => !isCrew(r)).reduce((a, r) => a + r.adults, 0),
    crew: on.filter(isCrew).reduce((a, r) => a + r.adults, 0),
    children: on.reduce((a, r) => a + r.minor_count, 0)
  };
  t.aboard = t.passengers + t.crew + t.children;
  t.expected = roster.reduce((a, r) => a + r.adults + r.minor_count, 0);
  t.ashore = t.expected - t.aboard;
  return t;
}

admin.get('/sailings', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT s.*,
        (SELECT COUNT(*) FROM sailing_checkins c WHERE c.sailing_id = s.id) AS registered,
        (SELECT COALESCE(SUM(adults + minor_count), 0) FROM sailing_checkins c WHERE c.sailing_id = s.id AND ${ABOARD}) AS aboard,
        (SELECT COALESCE(SUM(minor_count), 0) FROM sailing_checkins c WHERE c.sailing_id = s.id AND ${ABOARD}) AS children
      FROM sailings s ORDER BY s.sail_date DESC, s.id DESC LIMIT 200`);
    res.json({ rows });
  } catch (err) { next(err); }
});

admin.post('/sailings', async (req, res, next) => {
  try {
    const b = req.body || {};
    const sail_date = date(b.sail_date);
    if (!sail_date) return res.status(400).json({ error: 'A date is required' });
    const [r] = await pool.execute(
      'INSERT INTO sailings (sail_date, title, location, capacity, notes, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sail_date, str(b.title, 160), str(b.location, 160), Math.max(0, Number(b.capacity) || 0), str(b.notes, 600),
        ['planned', 'boarding', 'underway', 'closed'].includes(b.status) ? b.status : 'planned', req.user.id || null]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

admin.patch('/sailings/:id', async (req, res, next) => {
  try {
    const b = req.body || {}; const sets = []; const args = [];
    if (date(b.sail_date)) { sets.push('sail_date = ?'); args.push(date(b.sail_date)); }
    for (const k of ['title', 'location', 'notes']) if (k in b) { sets.push(`${k} = ?`); args.push(str(b[k], 600)); }
    if ('capacity' in b) { sets.push('capacity = ?'); args.push(Math.max(0, Number(b.capacity) || 0)); }
    if (['planned', 'boarding', 'underway', 'closed'].includes(b.status)) { sets.push('status = ?'); args.push(b.status); }
    if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
    await pool.execute(`UPDATE sailings SET ${sets.join(', ')} WHERE id = ?`, [...args, Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

admin.get('/sailings/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[s]] = await pool.query('SELECT * FROM sailings WHERE id = ?', [id]);
    if (!s) return res.status(404).json({ error: 'Not found' });
    const roster = await loadRoster(id);
    res.json({ sailing: s, roster, counts: tally(roster) });
  } catch (err) { next(err); }
});

async function loadRoster(id) {
  const [roster] = await pool.query(
    `SELECT c.*, w.pass_code, w.phone, w.minors, w.emergency_name, w.emergency_phone, w.expires_on
     FROM sailing_checkins c LEFT JOIN waivers w ON w.id = c.waiver_id
     WHERE c.sailing_id = ? ORDER BY (c.checked_in_at IS NOT NULL AND c.checked_out_at IS NULL) DESC, c.name`, [id]);
  // Named children, so the manifest can list them rather than just count them.
  const ids = roster.map(r => r.waiver_id).filter(Boolean);
  if (ids.length) {
    const [kids] = await pool.query(`SELECT waiver_id, name, age FROM waiver_minors WHERE waiver_id IN (${ids.map(() => '?').join(',')})`, ids);
    for (const r of roster) r.minor_names = kids.filter(k => k.waiver_id === r.waiver_id);
  } else {
    for (const r of roster) r.minor_names = [];
  }
  return roster;
}

// Check someone aboard: by scanned pass code, by roster row, or by name.
admin.post('/sailings/:id/checkin', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[s]] = await pool.query('SELECT * FROM sailings WHERE id = ?', [id]);
    if (!s) return res.status(404).json({ error: 'Not found' });
    const b = req.body || {};
    // A scanner may hand us the whole pass URL.
    const raw = str(b.code, 200).toUpperCase();
    const code = (raw.match(/([A-Z0-9]{8})\s*$/) || [])[1] || '';
    const adults = Math.max(1, Math.min(20, Number(b.adults) || 1));
    const role = ['guest', 'crew', 'volunteer'].includes(b.role) ? b.role : 'guest';

    let waiver = null;
    if (code) {
      const [[w]] = await pool.query('SELECT * FROM waivers WHERE pass_code = ?', [code]);
      if (!w) return res.status(404).json({ error: `No waiver for code ${code}. Sign them in on the tablet.` });
      if (w.revoked_at) return res.status(400).json({ error: 'That pass has been revoked.' });
      waiver = w;
    } else if (b.checkin_id) {
      const [[row]] = await pool.query('SELECT * FROM sailing_checkins WHERE id = ? AND sailing_id = ?', [Number(b.checkin_id), id]);
      if (!row) return res.status(404).json({ error: 'Not on this roster' });
      await pool.execute("UPDATE sailing_checkins SET checked_in_at = NOW(), checked_out_at = NULL, method = 'manual', by_user = ? WHERE id = ?", [req.user.id || null, row.id]);
      return res.json({ ok: true, name: row.name, aboard: true, adults: row.adults, minor_count: row.minor_count });
    } else if (str(b.name, 160)) {
      const kids = Math.max(0, Math.min(20, Number(b.minor_count) || 0));
      const [r] = await pool.execute(
        "INSERT INTO sailing_checkins (sailing_id, name, email, adults, minor_count, party_size, role, checked_in_at, method, by_user, note) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 'manual', ?, ?)",
        [id, str(b.name, 160), email(b.email) || '', adults, kids, adults + kids, role, req.user.id || null, str(b.note, 300)]);
      return res.json({ ok: true, name: str(b.name, 160), aboard: true, id: r.insertId, adults, minor_count: kids,
        warning: 'No waiver on file for this person — get one signed.' });
    } else {
      return res.status(400).json({ error: 'Scan a pass, or give a name.' });
    }

    const expired = waiver.expires_on && new Date(waiver.expires_on) < new Date(new Date().toDateString());
    const [[existing]] = await pool.query('SELECT * FROM sailing_checkins WHERE sailing_id = ? AND waiver_id = ?', [id, waiver.id]);
    const [[{ kids }]] = await pool.query('SELECT COUNT(*) AS kids FROM waiver_minors WHERE waiver_id = ?', [waiver.id]);
    if (existing) {
      if (existing.checked_in_at && !existing.checked_out_at) {
        return res.json({ ok: true, already: true, name: waiver.name, aboard: true, adults: existing.adults, minor_count: existing.minor_count, expired, since: existing.checked_in_at });
      }
      await pool.execute("UPDATE sailing_checkins SET checked_in_at = NOW(), checked_out_at = NULL, method = 'qr', by_user = ? WHERE id = ?", [req.user.id || null, existing.id]);
      return res.json({ ok: true, name: waiver.name, aboard: true, adults: existing.adults, minor_count: existing.minor_count, expired, minors: waiver.minors });
    }
    await pool.execute(
      "INSERT INTO sailing_checkins (sailing_id, waiver_id, name, email, adults, minor_count, party_size, role, checked_in_at, method, by_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'qr', ?)",
      [id, waiver.id, waiver.name, waiver.email, adults, kids, adults + kids, role, req.user.id || null]);
    res.json({ ok: true, name: waiver.name, aboard: true, adults, minor_count: kids, expired, minors: waiver.minors });
  } catch (err) { next(err); }
});

admin.post('/checkins/:id/out', async (req, res, next) => {
  try {
    await pool.execute('UPDATE sailing_checkins SET checked_out_at = NOW() WHERE id = ?', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Adjust a row at the brow: how many adults, how many children, guest or crew.
admin.post('/checkins/:id/party', async (req, res, next) => {
  try {
    const b = req.body || {}; const sets = []; const args = [];
    if ('adults' in b) { sets.push('adults = ?'); args.push(Math.max(0, Math.min(40, Number(b.adults) || 0))); }
    if ('minor_count' in b) { sets.push('minor_count = ?'); args.push(Math.max(0, Math.min(40, Number(b.minor_count) || 0))); }
    if (['guest', 'crew', 'volunteer'].includes(b.role)) { sets.push('role = ?'); args.push(b.role); }
    if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
    sets.push('party_size = adults + minor_count');
    await pool.execute(`UPDATE sailing_checkins SET ${sets.join(', ')} WHERE id = ?`, [...args, Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// The manifest as a PDF — what you hand a boarding officer.
admin.get('/sailings/:id/manifest', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[s]] = await pool.query('SELECT * FROM sailings WHERE id = ?', [id]);
    if (!s) return res.status(404).send('Not found');
    const roster = await loadRoster(id);
    const pdf = await manifestPdf(s, roster, tally(roster), req.user.name || '');
    res.type('application/pdf')
      .setHeader('Content-Disposition', `inline; filename="comanche-manifest-${s.sail_date}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
});

// Everyone ashore at once — end of the day.
admin.post('/sailings/:id/all-ashore', async (req, res, next) => {
  try {
    const [r] = await pool.execute(`UPDATE sailing_checkins SET checked_out_at = NOW() WHERE sailing_id = ? AND ${ABOARD}`, [Number(req.params.id)]);
    await pool.execute("UPDATE sailings SET status = 'closed' WHERE id = ?", [Number(req.params.id)]);
    res.json({ ok: true, ashore: r.affectedRows });
  } catch (err) { next(err); }
});

// ---- admin: waivers --------------------------------------------------------
admin.get('/waivers', async (req, res, next) => {
  try {
    const q = str(req.query.q, 80);
    const args = []; let where = '';
    if (q) { where = 'WHERE name LIKE ? OR email LIKE ? OR pass_code = ?'; args.push(`%${q}%`, `%${q}%`, q.toUpperCase()); }
    const [rows] = await pool.query(
      `SELECT id, created_at, name, email, phone, city, minors, guardian, photo_ok, method, pass_code, expires_on, revoked_at, waiver_version
       FROM waivers ${where} ORDER BY id DESC LIMIT 500`, args);
    res.json({ rows, version: W.VERSION });
  } catch (err) { next(err); }
});

admin.get('/waivers/:id', async (req, res, next) => {
  try {
    const [[w]] = await pool.query('SELECT * FROM waivers WHERE id = ?', [Number(req.params.id)]);
    if (!w) return res.status(404).json({ error: 'Not found' });
    // The text as it stood when they signed, if it is still the current one.
    res.json({ waiver: w, currentSha: W.sha(), text: w.waiver_sha === W.sha() ? W.fullText() : null });
  } catch (err) { next(err); }
});

admin.post('/waivers/:id/revoke', async (req, res, next) => {
  try {
    await pool.execute('UPDATE waivers SET revoked_at = NOW() WHERE id = ?', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = { pub, admin };
