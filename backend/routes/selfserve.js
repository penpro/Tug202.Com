// Self-service record page. Someone who signs up with an address we already
// hold gets a link mailed to that address; clicking it opens this page, where
// they can correct their name, add or drop an address, choose which mail they
// get, or leave entirely.
//
// The rule that makes this safe: typing an address into the public form never
// shows anyone anything. Details only appear after clicking a signed,
// expiring link delivered to that mailbox — so only the person who reads that
// mail can see or change the record. Nothing here touches portal accounts,
// roles or any other person's data.

const express = require('express');
const pool = require('../db');
const { page, esc } = require('../public-page');
const { verifyManageToken, manageUrl, MANAGE_DAYS } = require('../mail-template');
const { GROUPS, KEYS: GROUP_KEYS, isGroup } = require('../mail-groups');
const { send } = require('../mailer');

const router = express.Router();
const form = express.urlencoded({ extended: false });

const str = (v, n) => String(v ?? '').trim().slice(0, n);
const email = (v) => { const e = str(v, 254).toLowerCase(); return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(e) ? e : null; };
const STATUS_WORD = { unverified: 'not yet mailed', sent: 'receiving mail', confirmed: 'confirmed', bounced: 'bounced — not deliverable', unsubscribed: 'unsubscribed' };

// Everything we know about the person behind this address.
async function load(e) {
  const [[row]] = await pool.query(
    `SELECT c.* FROM contacts c JOIN contact_emails ce ON ce.contact_id = c.id WHERE ce.email = ? LIMIT 1`, [e]);
  const [emails] = row
    ? await pool.query('SELECT email, kind, status FROM contact_emails WHERE contact_id = ? ORDER BY kind = "primary" DESC, email', [row.id])
    : [[{ email: e, kind: 'primary', status: 'sent' }]];
  const [[prefs]] = await pool.query('SELECT * FROM mail_prefs WHERE email = ?', [e]);
  return {
    contact: row || null,
    emails,
    prefs: Object.fromEntries(GROUP_KEYS.map(k => [k, prefs ? !!prefs[k] : true]))
  };
}

function render(e, t, d, note) {
  const q = `t=${encodeURIComponent(t)}`;
  const c = d.contact || {};
  const others = d.emails.filter(x => x.email !== e);
  return page('Your details', `
    ${note ? `<p class="ok">${esc(note)}</p>` : ''}
    <p>This is what we hold for <strong>${esc(e)}</strong>. Change anything you like — it only affects your own record.</p>

    <h2>Name and contact</h2>
    <form method="POST" action="/api/manage/profile?${q}">
      <label class="f" for="n">Name</label><input id="n" type="text" name="name" value="${esc(c.name || '')}" autocomplete="name">
      <label class="f" for="ct">Town or city</label><input id="ct" type="text" name="city" value="${esc(c.city || '')}" autocomplete="address-level2">
      <label class="f" for="ph">Phone (optional)</label><input id="ph" type="text" name="phone" value="${esc(c.phone || '')}" autocomplete="tel">
      <p><button class="b" type="submit">Save</button></p>
    </form>

    <h2>Email addresses</h2>
    <div class="row"><span><strong>${esc(e)}</strong><br><span class="pill">this one &middot; ${esc(STATUS_WORD[d.emails.find(x => x.email === e)?.status] || 'on the list')}</span></span></div>
    ${others.map(x => `<div class="row">
      <span>${esc(x.email)}<br><span class="pill">${esc(STATUS_WORD[x.status] || x.status)}</span></span>
      <form method="POST" action="/api/manage/email-remove?${q}"><input type="hidden" name="email" value="${esc(x.email)}">
        <button class="b out sm" type="submit">Remove</button></form>
    </div>`).join('')}
    <form method="POST" action="/api/manage/email-add?${q}">
      <label class="f" for="ae">Add another address</label>
      <input id="ae" type="email" name="email" placeholder="you@example.com">
      <p><button class="b out sm" type="submit">Add address</button></p>
    </form>

    <h2>What we send you</h2>
    <form method="POST" action="/api/manage/topics?${q}">
      ${GROUPS.map(g => `<label class="g"><input type="checkbox" name="g" value="${g.key}"${d.prefs[g.key] ? ' checked' : ''}>
        <span><strong>${esc(g.label)}</strong><br><span class="s">${esc(g.hint)}</span></span></label>`).join('')}
      <p><button class="b" type="submit">Save preferences</button></p>
    </form>
    <form method="POST" action="/api/manage/unsubscribe?${q}">
      <p><button class="b out" type="submit">Unsubscribe from everything</button></p>
    </form>
    <p class="s">This link works for ${MANAGE_DAYS} days and only for this address. We never sell your details.</p>`);
}

// Resolve the token, or render the "expired" page. Returns null when handled.
function holder(req, res) {
  const e = verifyManageToken(req.query.t);
  if (!e) {
    res.status(400).type('html').send(page('Link expired', `<p>For your security these links stop working after ${MANAGE_DAYS} days.</p>
      <p>Enter your address on the <a href="https://tug202.org/support">sign-up page</a> and we will email you a fresh one.</p>`));
    return null;
  }
  return e;
}

router.get('/manage', async (req, res, next) => {
  try {
    const e = holder(req, res); if (!e) return;
    res.type('html').send(render(e, req.query.t, await load(e), req.query.saved ? 'Saved.' : ''));
  } catch (err) { next(err); }
});

router.post('/manage/profile', form, async (req, res, next) => {
  try {
    const e = holder(req, res); if (!e) return;
    const name = str(req.body?.name, 160), city = str(req.body?.city, 120), phone = str(req.body?.phone, 40);
    const [[row]] = await pool.query('SELECT c.id FROM contacts c JOIN contact_emails ce ON ce.contact_id = c.id WHERE ce.email = ? LIMIT 1', [e]);
    if (row) await pool.execute('UPDATE contacts SET name = ?, city = ?, phone = ? WHERE id = ?', [name, city, phone, row.id]);
    else {
      const [ins] = await pool.execute("INSERT INTO contacts (name, city, phone, source, optin) VALUES (?, ?, ?, 'signup', 1)", [name, city, phone]);
      await pool.execute("INSERT IGNORE INTO contact_emails (contact_id, email, kind, confidence, status) VALUES (?, ?, 'primary', 'high', 'confirmed')", [ins.insertId, e]);
    }
    res.type('html').send(render(e, req.query.t, await load(e), 'Saved. Thank you.'));
  } catch (err) { next(err); }
});

router.post('/manage/email-add', form, async (req, res, next) => {
  try {
    const e = holder(req, res); if (!e) return;
    const add = email(req.body?.email);
    const d = await load(e);
    if (!add) return res.type('html').send(render(e, req.query.t, d, 'That does not look like an email address.'));
    if (d.emails.some(x => x.email === add)) return res.type('html').send(render(e, req.query.t, d, 'We already have that one.'));
    // Belongs to someone else's record? Don't merge silently, and don't say whose.
    const [[taken]] = await pool.query('SELECT contact_id FROM contact_emails WHERE email = ? LIMIT 1', [add]);
    if (taken && (!d.contact || taken.contact_id !== d.contact.id)) {
      return res.type('html').send(render(e, req.query.t, d, 'That address is already on our list on its own. Sign up with it to manage it.'));
    }
    let contactId = d.contact?.id;
    if (!contactId) {
      const [ins] = await pool.execute("INSERT INTO contacts (name, source, optin) VALUES ('', 'signup', 1)", []);
      contactId = ins.insertId;
      await pool.execute("INSERT IGNORE INTO contact_emails (contact_id, email, kind, confidence, status) VALUES (?, ?, 'primary', 'high', 'confirmed')", [contactId, e]);
    }
    await pool.execute("INSERT IGNORE INTO contact_emails (contact_id, email, kind, confidence, status) VALUES (?, ?, 'alternate', 'high', 'confirmed')", [contactId, add]);
    await pool.execute('INSERT IGNORE INTO mail_prefs (email, source) VALUES (?, \'self\')', [add]);
    res.type('html').send(render(e, req.query.t, await load(e), `${add} added.`));
  } catch (err) { next(err); }
});

router.post('/manage/email-remove', form, async (req, res, next) => {
  try {
    const e = holder(req, res); if (!e) return;
    const drop = email(req.body?.email);
    const d = await load(e);
    // Never remove the address that opened the link — that would lock them out.
    if (!drop || drop === e || !d.contact || !d.emails.some(x => x.email === drop)) {
      return res.type('html').send(render(e, req.query.t, d, 'That address is not on your record.'));
    }
    await pool.execute('DELETE FROM contact_emails WHERE contact_id = ? AND email = ?', [d.contact.id, drop]);
    await pool.execute('DELETE FROM mail_prefs WHERE email = ?', [drop]);
    await pool.execute('UPDATE newsletter_subscribers SET unsubscribed_at = NOW() WHERE email = ? AND unsubscribed_at IS NULL', [drop]);
    res.type('html').send(render(e, req.query.t, await load(e), `${drop} removed.`));
  } catch (err) { next(err); }
});

router.post('/manage/topics', form, async (req, res, next) => {
  try {
    const e = holder(req, res); if (!e) return;
    const raw = req.body?.g; const on = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(isGroup);
    const { savePrefs } = require('./blasts');
    await savePrefs(e, on);
    if (!on.length) return res.type('html').send(page('You are unsubscribed', `<p><strong>${esc(e)}</strong> will not receive further mailings from us.</p><p>Changed your mind? <a href="https://tug202.org/support">Sign up again</a> any time.</p>`));
    res.type('html').send(render(e, req.query.t, await load(e), 'Preferences saved.'));
  } catch (err) { next(err); }
});

router.post('/manage/unsubscribe', form, async (req, res, next) => {
  try {
    const e = holder(req, res); if (!e) return;
    const { unsubscribeAll } = require('./blasts');
    await unsubscribeAll(e);
    res.type('html').send(page('You are unsubscribed', `<p><strong>${esc(e)}</strong> will not receive further mailings from us.</p><p>Changed your mind? <a href="https://tug202.org/support">Sign up again</a> any time.</p>`));
  } catch (err) { next(err); }
});

// Mail someone the link to their own record. Used by the signup form when the
// address is already on file.
async function mailManageLink(e, name) {
  const link = manageUrl(e);
  await send(e, 'Your details with the Tug Comanche Foundation',
    `${name ? name + ',' : 'Hello,'}\n\nYou (or someone) just signed up at tug202.org with this address, and we already have you on our list — so rather than adding you twice, here is a link to your own record:\n\n${link}\n\nYou can correct your name, add or remove an email address, choose which kinds of mail you get, or unsubscribe entirely. The link works for ${MANAGE_DAYS} days and only for this address.\n\nIf that wasn't you, ignore this — nothing has changed.\n\n— The crew of Comanche\ntug202.org`);
  return link;
}

module.exports = { router, mailManageLink };
