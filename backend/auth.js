const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const pool = require('./db');
const { str, email } = require('./validate');
const { send } = require('./mailer');
const { upsertContact } = require('./crm');

// ---------------------------------------------------------------------------
// Portal auth: sessions + bcrypt. First account is created by
// scripts/create-admin.js; further accounts by an admin via /api/admin/users,
// which hands back a one-time setup link (emailed too once SMTP is set).
// ---------------------------------------------------------------------------

const MIN_PASSWORD = 10;
const TOKEN_TTL = { setup: 7 * 24 * 3600 * 1000, reset: 2 * 3600 * 1000 };

const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, is_active: !!u.is_active, created_at: u.created_at, last_login_at: u.last_login_at, has_password: !!u.password_hash });

// Create a single-use link for `purpose`; previous unused tokens for the same
// purpose are invalidated so an old invite can't be replayed.
async function issueToken(userId, purpose) {
  const raw = crypto.randomBytes(32).toString('hex');
  await pool.execute('UPDATE user_tokens SET used_at = NOW() WHERE user_id = ? AND purpose = ? AND used_at IS NULL', [userId, purpose]);
  await pool.execute('INSERT INTO user_tokens (user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, FROM_UNIXTIME(?))',
    [userId, sha(raw), purpose, Math.floor((Date.now() + TOKEN_TTL[purpose]) / 1000)]);
  const base = process.env.APP_BASE_URL || 'https://tug202.org';
  return `${base}/admin/setup?token=${raw}`;
}

async function consumeToken(raw) {
  const [[t]] = await pool.query(
    'SELECT t.*, u.email, u.name FROM user_tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW()',
    [sha(str(raw, 200))]);
  return t || null;
}

// ---- middleware ------------------------------------------------------------
// Session user, or the legacy ADMIN_TOKEN bearer (kept for curl scripts).
function requireAuth(req, res, next) {
  if (req.session?.user) { req.user = req.session.user; return next(); }
  const expected = process.env.ADMIN_TOKEN || '';
  const header = req.get('authorization') || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : String(req.query.token || '');
  if (expected && !/replace-me/.test(expected) && given) {
    const a = Buffer.from(given), b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) { req.user = { id: 0, email: 'token', name: 'The Tug Comanche board', role: 'admin' }; return next(); }
  }
  res.status(401).json({ error: 'Sign in required' });
}

function requireAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  res.status(403).json({ error: 'Admin role required' });
}

// ---- routes: /api/auth ------------------------------------------------------
const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in 15 minutes.' } });

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const e = email(req.body?.email); const pw = String(req.body?.password || '');
    if (!e || !pw) return res.status(400).json({ error: 'Email and password required' });
    const [[u]] = await pool.query('SELECT * FROM users WHERE email = ?', [e]);
    const ok = u && u.is_active && u.password_hash && await bcrypt.compare(pw, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Email or password is incorrect' });
    await new Promise((r, j) => req.session.regenerate(err => err ? j(err) : r()));
    req.session.user = { id: u.id, email: u.email, name: u.name, role: u.role };
    await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [u.id]);
    res.json({ user: req.session.user });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => { res.clearCookie('tug202.sid'); res.json({ ok: true }); });
});

router.get('/me', (req, res) => {
  res.json({ user: req.session?.user || null });
});

// Look up an invite/reset link before showing the form.
router.get('/token', async (req, res, next) => {
  try {
    const t = await consumeToken(req.query.token);
    if (!t) return res.status(404).json({ error: 'This link is invalid or has expired. Ask an admin for a new one.' });
    res.json({ email: t.email, name: t.name, purpose: t.purpose });
  } catch (err) { next(err); }
});

// Finish setup / reset: set the password, burn the token, sign in.
router.post('/setup', loginLimiter, async (req, res, next) => {
  try {
    const t = await consumeToken(req.body?.token);
    if (!t) return res.status(400).json({ error: 'This link is invalid or has expired.' });
    const pw = String(req.body?.password || '');
    if (pw.length < MIN_PASSWORD) return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters.` });
    const name = str(req.body?.name, 120) || t.name;
    const hash = await bcrypt.hash(pw, 12);
    await pool.execute('UPDATE users SET password_hash = ?, name = ?, is_active = 1 WHERE id = ?', [hash, name, t.user_id]);
    const [[who]] = await pool.query('SELECT email FROM users WHERE id = ?', [t.user_id]);
    if (who) await upsertContact({ email: who.email, name, source: 'board', tags: 'board', optin: 1 }).catch(() => {});
    await pool.execute('UPDATE user_tokens SET used_at = NOW() WHERE id = ?', [t.id]);
    const [[u]] = await pool.query('SELECT * FROM users WHERE id = ?', [t.user_id]);
    await new Promise((r, j) => req.session.regenerate(err => err ? j(err) : r()));
    req.session.user = { id: u.id, email: u.email, name: u.name, role: u.role };
    res.json({ user: req.session.user });
  } catch (err) { next(err); }
});

// Signed-in user changes their own password.
router.post('/password', requireAuth, async (req, res, next) => {
  try {
    if (!req.session?.user) return res.status(403).json({ error: 'Session required' });
    const cur = String(req.body?.current || ''), pw = String(req.body?.password || '');
    if (pw.length < MIN_PASSWORD) return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters.` });
    const [[u]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
    if (!u || !(await bcrypt.compare(cur, u.password_hash || ''))) return res.status(401).json({ error: 'Current password is incorrect' });
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(pw, 12), u.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- routes: /api/admin/users (admin only) ---------------------------------
const users = express.Router();
users.use(requireAdmin);

users.get('/users', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users ORDER BY role, name, email');
    res.json({ users: rows.map(publicUser) });
  } catch (err) { next(err); }
});

// Invite: creates the account (no password yet) and returns a setup link.
users.post('/users', async (req, res, next) => {
  try {
    const e = email(req.body?.email); const name = str(req.body?.name, 120);
    const role = ['admin', 'editor', 'inventory'].includes(req.body?.role) ? req.body.role : 'editor';
    if (!e) return res.status(400).json({ error: 'Valid email required' });
    const [[exists]] = await pool.query('SELECT id FROM users WHERE email = ?', [e]);
    if (exists) return res.status(409).json({ error: 'That email already has an account' });
    const [r] = await pool.execute('INSERT INTO users (email, name, role, created_by) VALUES (?, ?, ?, ?)', [e, name, role, req.user.id || null]);
    // Board members belong on the mailing list too — they should see the news
    // their own foundation sends. Tagged 'board' so they're easy to pick out.
    await upsertContact({ email: e, name, source: 'board', sourceRef: `portal ${role}`, tags: 'board', optin: 1,
      statusNote: 'board member / portal user' }).catch(err => console.error('[crm]', err.message));

    const link = await issueToken(r.insertId, 'setup');
    const mailed = await send(e, 'Your Tug Comanche admin account',
      `${req.user.name || 'An admin'} has given you access to the tug202.org admin portal.\n\nSet your password here (link valid 7 days):\n${link}\n\nIf you weren't expecting this, ignore it.`);
    const [[u]] = await pool.query('SELECT * FROM users WHERE id = ?', [r.insertId]);
    res.status(201).json({ user: publicUser(u), link, mailed });
  } catch (err) { next(err); }
});

users.patch('/users/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id); const b = req.body || {};
    if (id === req.user.id && ((b.role && b.role !== 'admin') || b.is_active === false)) return res.status(400).json({ error: "You can't demote or deactivate yourself" });
    const sets = []; const args = [];
    if (['admin', 'editor', 'inventory'].includes(b.role)) { sets.push('role = ?'); args.push(b.role); }
    if ('is_active' in b) { sets.push('is_active = ?'); args.push(b.is_active ? 1 : 0); }
    if ('name' in b) { sets.push('name = ?'); args.push(str(b.name, 120)); }
    if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
    // Never let the last active admin be removed.
    if ((b.role && b.role !== 'admin') || b.is_active === false) {
      const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM users WHERE role = "admin" AND is_active = 1 AND id <> ?', [id]);
      if (n === 0) return res.status(400).json({ error: 'That would leave no active admin' });
    }
    await pool.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...args, id]);
    if (b.is_active === false) await pool.execute('DELETE FROM sessions WHERE data LIKE ?', [`%"id":${id},%`]);
    const [[u]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json({ user: publicUser(u) });
  } catch (err) { next(err); }
});

// New setup/reset link for an existing user (lost password, or invite expired).
users.post('/users/:id/reset-link', async (req, res, next) => {
  try {
    const [[u]] = await pool.query('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
    if (!u) return res.status(404).json({ error: 'Not found' });
    const purpose = u.password_hash ? 'reset' : 'setup';
    const link = await issueToken(u.id, purpose);
    const mailed = await send(u.email, 'Reset your Tug Comanche admin password',
      `Set a new password for the tug202.org admin portal (link valid ${purpose === 'setup' ? '7 days' : '2 hours'}):\n${link}`);
    res.json({ link, mailed, purpose });
  } catch (err) { next(err); }
});

users.delete('/users/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: "You can't delete yourself" });
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM users WHERE role = "admin" AND is_active = 1 AND id <> ?', [id]);
    if (n === 0) return res.status(400).json({ error: 'That would leave no active admin' });
    const [r] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ deleted: r.affectedRows });
  } catch (err) { next(err); }
});

module.exports = { router, users, requireAuth, requireAdmin, issueToken };
