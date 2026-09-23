// Donation receipts, requested online.
//
//   public:  POST /api/receipt-request        donor asks for a receipt
//   admin:   GET  /admin/receipts             queue
//            PATCH /admin/receipts/:id        correct the details before issuing
//            POST /admin/receipts/:id/issue   assign a number, mail the donor
//            GET  /admin/receipts/:id/print   the filled receipt, ready to print
//
// The board issues the receipt — a request is never a receipt on its own, and
// the numbered document only exists once someone has checked it against the
// actual deposit.

const express = require('express');
const pool = require('../db');
const { str, email } = require('../validate');
const { notify, send, deliver } = require('../mailer');
const { upsertContact } = require('../crm');
const { receiptHtml, receiptText } = require('../receipt');

const pub = express.Router();
const admin = express.Router();

const SITE = () => (process.env.APP_BASE_URL || 'https://tug202.org').replace(/\/$/, '');
const date = (v) => { const d = String(v || '').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null; };
const money = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 && n < 100000000 ? n.toFixed(2) : null;
};

// The donor-supplied half of the paper form.
function fields(b) {
  const kind = b.gift_kind === 'noncash' ? 'noncash' : 'cash';
  const goods = b.goods === true || b.goods === 'true' || b.goods === 1 ? 1 : 0;
  return {
    donor_name: str(b.donor_name, 160),
    address: str(b.address, 300),
    email: email(b.email) || '',
    phone: str(b.phone, 40),
    gift_kind: kind,
    received_on: date(b.received_on),
    amount: kind === 'cash' ? money(b.amount) : null,
    method: str(b.method, 40),
    check_no: str(b.check_no, 40),
    description: kind === 'noncash' ? str(b.description, 1000) : '',
    restricted_for: str(b.restricted_for, 200),
    goods,
    goods_desc: goods ? str(b.goods_desc, 300) : '',
    goods_value: goods ? money(b.goods_value) : null,
    note: str(b.note, 1000)
  };
}

// ---- public ----------------------------------------------------------------
pub.post('/receipt-request', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (str(b.website, 100)) return res.json({ message: 'Thank you — we will send your receipt shortly.' }); // honeypot
    const f = fields(b);
    if (!f.donor_name || !f.email) return res.status(400).json({ error: 'Your name and a valid email address are required.' });
    if (!f.received_on) return res.status(400).json({ error: 'Please tell us roughly when the donation was made.' });
    if (f.gift_kind === 'cash' && !f.amount) return res.status(400).json({ error: 'Please enter the amount of the donation.' });
    if (f.gift_kind === 'noncash' && !f.description) return res.status(400).json({ error: 'Please describe what was donated.' });

    const cols = Object.keys(f);
    const [r] = await pool.execute(
      `INSERT INTO receipt_requests (${cols.join(', ')}, ip) VALUES (${cols.map(() => '?').join(', ')}, ?)`,
      [...cols.map(k => f[k]), req.ip]);

    // A donor is someone we should have a record of; they're subscribed to
    // nothing — asking for a receipt isn't joining a mailing list.
    await upsertContact({
      email: f.email, name: f.donor_name, phone: f.phone, source: 'donor', sourceRef: 'receipt request', tags: 'donor',
      note: `Receipt request #${r.insertId}`, statusNote: 'requested a donation receipt'
    }, { prefs: { newsletter: false, volunteer: false, events: false, reunions: false } }).catch(() => {});

    notify(`[tug202.org] Receipt request — ${f.donor_name}`,
      [`${f.donor_name} <${f.email}> asked for a donation receipt.`, '',
       `Received: ${f.received_on}`,
       f.gift_kind === 'cash' ? `Amount: $${f.amount} ${f.method}${f.check_no ? ' no. ' + f.check_no : ''}` : `Non-cash: ${f.description}`,
       f.restricted_for && `Restricted for: ${f.restricted_for}`,
       f.goods ? `Goods/services received: ${f.goods_desc} (value ${f.goods_value ?? '?'})` : 'No goods or services received.',
       f.note && `Note: ${f.note}`, '',
       `Review and issue: ${SITE()}/admin/receipts`].filter(Boolean).join('\n'), f.email);

    res.json({ message: 'Thank you — your request is with the board. We check it against our records and email your receipt, usually within a few days.' });
  } catch (err) { next(err); }
});

// ---- admin -----------------------------------------------------------------
admin.get('/receipts', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM receipt_requests ORDER BY status = "new" DESC, id DESC LIMIT 500');
    res.json({ rows });
  } catch (err) { next(err); }
});

admin.patch('/receipts/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[row]] = await pool.query('SELECT * FROM receipt_requests WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const f = fields({ ...row, ...req.body });
    if (!f.donor_name || !f.email) return res.status(400).json({ error: 'Name and email are required' });
    const sets = Object.keys(f).map(k => `${k} = ?`).join(', ');
    await pool.execute(`UPDATE receipt_requests SET ${sets}, admin_note = ? WHERE id = ?`,
      [...Object.values(f), str(req.body?.admin_note ?? row.admin_note, 1000), id]);
    const [[out]] = await pool.query('SELECT * FROM receipt_requests WHERE id = ?', [id]);
    res.json({ row: out });
  } catch (err) { next(err); }
});

// Receipt numbers are sequential per calendar year: 2026-001, 2026-002…
async function nextNumber() {
  const year = new Date().getFullYear();
  const [[{ n }]] = await pool.query(
    "SELECT COUNT(*) AS n FROM receipt_requests WHERE receipt_no LIKE ?", [`${year}-%`]);
  return `${year}-${String(n + 1).padStart(3, '0')}`;
}

admin.post('/receipts/:id/issue', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[row]] = await pool.query('SELECT * FROM receipt_requests WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const issuer_name = str(req.body?.issuer_name, 120) || req.user.name || '';
    const issuer_title = str(req.body?.issuer_title, 120);
    if (!issuer_name) return res.status(400).json({ error: 'Who is issuing this receipt?' });

    const receipt_no = row.receipt_no || await nextNumber();
    await pool.execute(
      "UPDATE receipt_requests SET status = 'issued', receipt_no = ?, issued_at = COALESCE(issued_at, NOW()), issued_by = ?, issuer_name = ?, issuer_title = ? WHERE id = ?",
      [receipt_no, req.user.id || null, issuer_name, issuer_title, id]);
    const [[out]] = await pool.query('SELECT * FROM receipt_requests WHERE id = ?', [id]);

    let mailed = false;
    if (req.body?.email !== false) {
      try {
        await deliver({
          to: out.email,
          subject: `Your donation receipt (${receipt_no}) — Tug Comanche Historical Rescue Foundation`,
          text: receiptText(out),
          html: receiptHtml(out, SITE())
        });
        mailed = true;
      } catch (err) { console.error('[receipt mail]', err.message); }
    }
    res.json({ row: out, mailed });
  } catch (err) { next(err); }
});

admin.post('/receipts/:id/decline', async (req, res, next) => {
  try {
    await pool.execute("UPDATE receipt_requests SET status = 'declined', admin_note = ? WHERE id = ?",
      [str(req.body?.admin_note, 1000), Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// The filled receipt, for printing or saving as PDF. Draft until issued.
admin.get('/receipts/:id/print', async (req, res, next) => {
  try {
    const [[row]] = await pool.query('SELECT * FROM receipt_requests WHERE id = ?', [Number(req.params.id)]);
    if (!row) return res.status(404).send('Not found');
    if (!row.issuer_name) row.issuer_name = req.user.name || '';
    res.type('html').send(receiptHtml(row, SITE()));
  } catch (err) { next(err); }
});

module.exports = { pub, admin };
