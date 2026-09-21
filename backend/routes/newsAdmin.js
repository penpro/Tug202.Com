const express = require('express');
const pool = require('../db');
const { str } = require('../validate');

// News CRUD for the portal (mounted under /api/admin, behind requireAuth).
const router = express.Router();

const slugify = (s) => str(s, 120).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');

router.get('/news', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, slug, DATE_FORMAT(published_on, '%Y-%m-%d') AS date, title, body, image, is_published, updated_at FROM news_posts ORDER BY published_on DESC, id DESC");
    res.json({ posts: rows.map(r => ({ ...r, is_published: !!r.is_published })) });
  } catch (err) { next(err); }
});

router.post('/news', async (req, res, next) => {
  try {
    const b = req.body || {};
    const title = str(b.title, 200); const body = str(b.body, 20000);
    const date = isDate(b.date) ? b.date : new Date().toISOString().slice(0, 10);
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
    let slug = slugify(b.slug || title) || 'post';
    const [[dupe]] = await pool.query('SELECT id FROM news_posts WHERE slug = ?', [slug]);
    if (dupe) slug += '-' + Date.now().toString(36);
    const [r] = await pool.execute(
      'INSERT INTO news_posts (slug, published_on, title, body, image, is_published) VALUES (?, ?, ?, ?, ?, ?)',
      [slug, date, title, body, str(b.image, 120) || null, b.is_published === false ? 0 : 1]);
    res.status(201).json({ id: r.insertId, slug });
  } catch (err) { next(err); }
});

router.patch('/news/:id', async (req, res, next) => {
  try {
    const b = req.body || {}; const sets = []; const args = [];
    if ('title' in b) { sets.push('title = ?'); args.push(str(b.title, 200)); }
    if ('body' in b) { sets.push('body = ?'); args.push(str(b.body, 20000)); }
    if (isDate(b.date)) { sets.push('published_on = ?'); args.push(b.date); }
    if ('image' in b) { sets.push('image = ?'); args.push(str(b.image, 120) || null); }
    if ('is_published' in b) { sets.push('is_published = ?'); args.push(b.is_published ? 1 : 0); }
    if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
    await pool.execute(`UPDATE news_posts SET ${sets.join(', ')} WHERE id = ?`, [...args, Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/news/:id', async (req, res, next) => {
  try {
    const [r] = await pool.execute('DELETE FROM news_posts WHERE id = ?', [Number(req.params.id)]);
    res.json({ deleted: r.affectedRows });
  } catch (err) { next(err); }
});

module.exports = router;
