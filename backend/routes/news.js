const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/news — published posts, newest first. The frontend falls back to
// its bundled seed list if this fails or returns nothing.
router.get('/news', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT slug AS id, DATE_FORMAT(published_on, '%Y-%m-%d') AS date, title, body, image
         FROM news_posts
        WHERE is_published = 1
        ORDER BY published_on DESC, id DESC
        LIMIT 100`
    );
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ posts: rows });
  } catch (err) { next(err); }
});

module.exports = router;
