// DMARC reports in the portal: drop the file providers email you onto the
// Dashboard and get a plain-English answer to "is anyone sending as us?"
// See backend/dmarc.js for what these reports do and don't contain.

const express = require('express');
const pool = require('../db');
const { parse, isOurs } = require('../dmarc');

const router = express.Router();

// Upload: raw bytes, any of .xml / .xml.gz / .zip. Idempotent per report id.
router.post('/dmarc/upload', express.raw({ type: '*/*', limit: '8mb' }), async (req, res, next) => {
  try {
    if (!req.body?.length) return res.status(400).json({ error: 'No file received' });
    let parsed;
    try { parsed = parse(req.body); }
    catch (err) { return res.status(400).json({ error: err.message }); }
    const { report, rows } = parsed;

    const [ins] = await pool.execute(
      'INSERT IGNORE INTO dmarc_reports (report_id, org_name, domain, policy, begins_at, ends_at, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [report.report_id, report.org_name, report.domain, report.policy, report.begins_at, report.ends_at, req.user.id || null]);
    if (!ins.insertId) return res.json({ ok: true, duplicate: true, org: report.org_name });

    for (const r of rows) {
      await pool.execute(
        'INSERT INTO dmarc_rows (report_id, source_ip, count, disposition, dkim, spf, header_from, dkim_domains, spf_domains) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ins.insertId, r.source_ip, r.count, r.disposition, r.dkim, r.spf, r.header_from, r.dkim_domains, r.spf_domains]);
    }
    const messages = rows.reduce((a, r) => a + r.count, 0);
    res.status(201).json({ ok: true, org: report.org_name, messages, foreign: rows.filter(r => !isOurs(r)).reduce((a, r) => a + r.count, 0) });
  } catch (err) { next(err); }
});

// Summary for the Dashboard panel: last `days` days of uploaded reports.
router.get('/dmarc/summary', async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const [[tot]] = await pool.query(
      `SELECT COUNT(DISTINCT r.id) AS reports, COALESCE(SUM(w.count), 0) AS messages,
              COALESCE(SUM(CASE WHEN w.dkim = 'pass' OR w.spf = 'pass' THEN w.count ELSE 0 END), 0) AS passed,
              COALESCE(SUM(CASE WHEN w.disposition <> 'none' THEN w.count ELSE 0 END), 0) AS rejected,
              MAX(r.ends_at) AS latest, MIN(r.begins_at) AS earliest
       FROM dmarc_reports r LEFT JOIN dmarc_rows w ON w.report_id = r.id
       WHERE r.ends_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [days]);
    const [sources] = await pool.query(
      `SELECT w.source_ip, SUM(w.count) AS messages, MAX(w.dkim_domains) AS dkim_domains, MAX(w.spf_domains) AS spf_domains,
              SUM(CASE WHEN w.dkim = 'pass' OR w.spf = 'pass' THEN w.count ELSE 0 END) AS passed
       FROM dmarc_rows w JOIN dmarc_reports r ON r.id = w.report_id
       WHERE r.ends_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY w.source_ip ORDER BY messages DESC LIMIT 50`, [days]);
    const [reporters] = await pool.query(
      `SELECT org_name, COUNT(*) AS reports, MAX(ends_at) AS latest FROM dmarc_reports
       WHERE ends_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY org_name ORDER BY latest DESC`, [days]);
    const [[{ policy } = {}]] = await pool.query('SELECT policy FROM dmarc_reports ORDER BY ends_at DESC LIMIT 1');

    const marked = sources.map(s => ({ ...s, messages: Number(s.messages), passed: Number(s.passed), ours: isOurs(s) }));
    const foreign = marked.filter(s => !s.ours);
    res.json({
      days, policy: policy || null,
      totals: { ...tot, messages: Number(tot.messages), passed: Number(tot.passed), rejected: Number(tot.rejected) },
      sources: marked, foreign, reporters
    });
  } catch (err) { next(err); }
});

module.exports = router;
