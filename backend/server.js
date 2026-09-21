// Resolve .env next to this file, not the process cwd, so `node backend/server.js`
// from the repo root and `pm2 start server.js` from backend/ both work.
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const rateLimit = require('express-rate-limit');
const pool = require('./db');
const { router: authRouter } = require('./auth');
const formsRouter = require('./routes/forms');
const newsRouter = require('./routes/news');
const adminRouter = require('./routes/admin');

const app = express();
const port = Number(process.env.PORT) || 3202;
const isProd = process.env.NODE_ENV === 'production';

// Refuse to run in production without a real session secret; an example
// value would let anyone forge an admin session.
if (isProd && (!process.env.SESSION_SECRET || /replace-me|example/i.test(process.env.SESSION_SECRET))) {
  console.error('FATAL: SESSION_SECRET missing or placeholder in production.');
  process.exit(1);
}

// Behind nginx: trust X-Forwarded-For so req.ip and the rate limiter see
// the visitor's address, not 127.0.0.1.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '32kb' }));

// Portal sessions, stored in MySQL (table created by migration 010).
app.use(session({
  name: 'tug202.sid',
  secret: process.env.SESSION_SECRET || 'dev-only-not-secret',
  store: new MySQLStore({ createDatabaseTable: false, schema: { tableName: 'sessions' }, clearExpired: true, checkExpirationInterval: 15 * 60 * 1000 }, pool.pool),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 12 * 60 * 60 * 1000, path: '/' }
}));

// Generous global cap, tighter cap on the write endpoints.
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this address. Please try again later or email us directly.' }
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: true });
  } catch (err) {
    res.status(503).json({ ok: false, db: false });
  }
});

app.use('/api/auth', authRouter);
app.use('/api', formLimiter, formsRouter);
app.use('/api', newsRouter);
app.use('/api/admin', adminRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error. Please try again later or email us directly.' });
});

// Loopback only: nginx is the sole client. Keeps :3202 off the public interface.
app.listen(port, '127.0.0.1', () => {
  console.log(`tug202 backend listening on :${port}`);
  pool.query('SELECT 1')
    .then(() => console.log('MySQL connection OK'))
    .catch(err => console.error('MySQL connection FAILED:', err.message));
});
