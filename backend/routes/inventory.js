// Ship's inventory: what we have, how many, where it is, and photographs of
// all of it. Written for a volunteer holding a phone in a dark locker, so the
// API takes partial records happily and fills in the rest later.
//
//   GET    /admin/inventory                list + search + facets
//   POST   /admin/inventory                create (a name is all that's required)
//   GET    /admin/inventory/:id            one item, its photos and its history
//   PATCH  /admin/inventory/:id            edit
//   POST   /admin/inventory/:id/qty        { delta | qty, reason } — logged
//   DELETE /admin/inventory/:id            remove
//   POST   /admin/inventory/:id/photo      raw image bytes; ?kind=&caption=
//   GET    /admin/inventory/photo/:file    serve one (session-authenticated)
//   DELETE /admin/inventory/photo/:id      remove one
//
// Photos arrive already downscaled by the browser — the server has 900 MB of
// RAM and no image library.

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const pool = require('../db');
const { str } = require('../validate');

const router = express.Router();

// Outside the repo and outside the web root: served only through this router.
const UPLOADS = process.env.UPLOAD_DIR || path.join(process.env.HOME || '/home/ubuntu', 'tug202-uploads', 'inventory');
fs.mkdirSync(UPLOADS, { recursive: true });

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const KINDS = ['location', 'container', 'packaging', 'part', 'label', 'other'];
const CONDS = ['new', 'used-good', 'serviceable', 'needs-repair', 'scrap', 'unknown'];
const STATUSES = ['active', 'low', 'used-up', 'disposed'];

const int = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
const url = (v) => { const u = str(v, 600); return /^https?:\/\//i.test(u) ? u : ''; };

function fields(b) {
  return {
    name: str(b.name, 200),
    part_number: str(b.part_number, 120),
    manufacturer: str(b.manufacturer, 120),
    qty: Math.max(0, int(b.qty, 0)),
    unit: str(b.unit, 24) || 'each',
    min_qty: Math.max(0, int(b.min_qty, 0)),
    ship_system: str(b.ship_system, 120),
    location: str(b.location, 200),
    container_type: str(b.container_type, 80),
    container_id: str(b.container_id, 80),
    cond: CONDS.includes(b.cond) ? b.cond : 'unknown',
    status: STATUSES.includes(b.status) ? b.status : 'active',
    tags: str(b.tags, 300).split(',').map(t => t.trim()).filter(Boolean).join(','),
    vendor: str(b.vendor, 160),
    order_url: url(b.order_url),
    alt_order_url: url(b.alt_order_url),
    price: b.price === '' || b.price === null || b.price === undefined || isNaN(Number(b.price)) ? null : Number(b.price).toFixed(2),
    order_notes: str(b.order_notes, 600),
    procedure_ref: str(b.procedure_ref, 200),
    procedure_url: url(b.procedure_url),
    notes: str(b.notes, 60000)
  };
}

// An item is "low" when it drops to or below its own reorder point.
const withStatus = (f) => ({
  ...f,
  status: f.status === 'disposed' || f.status === 'used-up' ? f.status
    : (f.min_qty > 0 && f.qty <= f.min_qty ? 'low' : 'active')
});

// ---- list, search, facets ---------------------------------------------------
router.get('/inventory', async (req, res, next) => {
  try {
    const where = []; const args = [];
    const q = str(req.query.q, 120);
    if (q) {
      // LIKE rather than MATCH: people search for half a part number, and
      // fulltext wants whole words.
      const like = `%${q}%`;
      where.push('(name LIKE ? OR part_number LIKE ? OR manufacturer LIKE ? OR ship_system LIKE ? OR location LIKE ? OR container_id LIKE ? OR tags LIKE ?)');
      args.push(like, like, like, like, like, like, like);
    }
    for (const [k, col] of [['system', 'ship_system'], ['location', 'location'], ['container_type', 'container_type'], ['status', 'status']]) {
      if (req.query[k]) { where.push(`${col} = ?`); args.push(str(req.query[k], 200)); }
    }
    if (req.query.tag) { where.push('FIND_IN_SET(?, tags)'); args.push(str(req.query.tag, 60)); }
    if (req.query.low === '1') where.push("status = 'low'");
    const sql = `SELECT i.*, (SELECT file FROM inventory_photos p WHERE p.item_id = i.id ORDER BY p.kind = 'part' DESC, p.sort, p.id LIMIT 1) AS thumb,
        (SELECT COUNT(*) FROM inventory_photos p WHERE p.item_id = i.id) AS photo_count
      FROM inventory_items i ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY i.updated_at DESC LIMIT 500`;
    const [rows] = await pool.query(sql, args);

    // Everything already typed, so the forms can suggest instead of demanding.
    const facet = async (col) => (await pool.query(
      `SELECT ${col} AS v, COUNT(*) AS n FROM inventory_items WHERE ${col} <> '' GROUP BY ${col} ORDER BY n DESC, v LIMIT 60`))[0];
    const [systems, locations, containers, units, tagRows, [[totals]]] = await Promise.all([
      facet('ship_system'), facet('location'), facet('container_type'), facet('unit'),
      pool.query("SELECT tags FROM inventory_items WHERE tags <> ''").then(r => r[0]),
      pool.query("SELECT COUNT(*) AS items, COALESCE(SUM(qty),0) AS pieces, SUM(status = 'low') AS low FROM inventory_items")
    ]);
    const tags = [...new Set(tagRows.flatMap(r => r.tags.split(',')))].filter(Boolean).sort();
    res.json({ rows, facets: { systems, locations, containers, units, tags }, totals });
  } catch (err) { next(err); }
});

router.post('/inventory', async (req, res, next) => {
  try {
    const f = withStatus(fields(req.body || {}));
    if (!f.name) return res.status(400).json({ error: 'Give it a name — everything else can come later.' });
    const cols = Object.keys(f);
    const [r] = await pool.execute(
      `INSERT INTO inventory_items (${cols.join(', ')}, created_by, updated_by) VALUES (${cols.map(() => '?').join(', ')}, ?, ?)`,
      [...cols.map(k => f[k]), req.user.id || null, req.user.id || null]);
    if (f.qty) await pool.execute('INSERT INTO inventory_moves (item_id, delta, qty_after, reason, created_by) VALUES (?, ?, ?, ?, ?)',
      [r.insertId, f.qty, f.qty, 'first count', req.user.id || null]);
    const [[row]] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [r.insertId]);
    res.status(201).json({ row });
  } catch (err) { next(err); }
});

router.get('/inventory/:id(\\d+)', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[row]] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const [photos] = await pool.query('SELECT id, kind, file, caption, bytes, sort, created_at FROM inventory_photos WHERE item_id = ? ORDER BY kind, sort, id', [id]);
    const [moves] = await pool.query(
      `SELECT m.*, u.name AS who FROM inventory_moves m LEFT JOIN users u ON u.id = m.created_by
       WHERE m.item_id = ? ORDER BY m.id DESC LIMIT 50`, [id]);
    res.json({ row, photos, moves });
  } catch (err) { next(err); }
});

router.patch('/inventory/:id(\\d+)', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[cur]] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const f = withStatus(fields({ ...cur, ...req.body }));
    if (!f.name) return res.status(400).json({ error: 'A name is required' });
    if (f.qty !== cur.qty) {
      await pool.execute('INSERT INTO inventory_moves (item_id, delta, qty_after, reason, created_by) VALUES (?, ?, ?, ?, ?)',
        [id, f.qty - cur.qty, f.qty, str(req.body?.reason, 200) || 'edited', req.user.id || null]);
    }
    const sets = Object.keys(f).map(k => `${k} = ?`).join(', ');
    await pool.execute(`UPDATE inventory_items SET ${sets}, updated_by = ? WHERE id = ?`, [...Object.values(f), req.user.id || null, id]);
    const [[row]] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    res.json({ row });
  } catch (err) { next(err); }
});

// Take one off the shelf, or put two back — the common case, one tap.
router.post('/inventory/:id(\\d+)/qty', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[cur]] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const next_ = 'qty' in (req.body || {}) ? Math.max(0, int(req.body.qty, cur.qty)) : Math.max(0, cur.qty + int(req.body?.delta, 0));
    const status = cur.status === 'disposed' || cur.status === 'used-up' ? cur.status
      : (cur.min_qty > 0 && next_ <= cur.min_qty ? 'low' : 'active');
    await pool.execute('UPDATE inventory_items SET qty = ?, status = ?, updated_by = ? WHERE id = ?', [next_, status, req.user.id || null, id]);
    await pool.execute('INSERT INTO inventory_moves (item_id, delta, qty_after, reason, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, next_ - cur.qty, next_, str(req.body?.reason, 200), req.user.id || null]);
    res.json({ qty: next_, status });
  } catch (err) { next(err); }
});

router.delete('/inventory/:id(\\d+)', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [photos] = await pool.query('SELECT file FROM inventory_photos WHERE item_id = ?', [id]);
    await pool.execute('DELETE FROM inventory_items WHERE id = ?', [id]);
    for (const p of photos) await fsp.unlink(path.join(UPLOADS, p.file)).catch(() => {});
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- photos -----------------------------------------------------------------
// Raw bytes, one photo per request: no multipart parser, and the browser has
// already shrunk it.
router.post('/inventory/:id(\\d+)/photo', express.raw({ type: Object.keys(TYPES), limit: '12mb' }), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[item]] = await pool.query('SELECT id FROM inventory_items WHERE id = ?', [id]);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const ext = TYPES[(req.get('content-type') || '').split(';')[0].trim()];
    if (!ext) return res.status(400).json({ error: 'Send a JPEG, PNG or WebP.' });
    if (!req.body?.length) return res.status(400).json({ error: 'Empty upload' });

    const kind = KINDS.includes(req.query.kind) ? req.query.kind : 'part';
    const file = `${id}-${kind}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    await fsp.writeFile(path.join(UPLOADS, file), req.body);

    const [[{ next_sort }]] = await pool.query('SELECT COALESCE(MAX(sort), 0) + 1 AS next_sort FROM inventory_photos WHERE item_id = ? AND kind = ?', [id, kind]);
    const [r] = await pool.execute(
      'INSERT INTO inventory_photos (item_id, kind, file, caption, bytes, sort, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, kind, file, str(req.query.caption, 200), req.body.length, next_sort, req.user.id || null]);
    await pool.execute('UPDATE inventory_items SET updated_at = NOW(), updated_by = ? WHERE id = ?', [req.user.id || null, id]);
    res.status(201).json({ photo: { id: r.insertId, kind, file, caption: str(req.query.caption, 200), bytes: req.body.length } });
  } catch (err) { next(err); }
});

router.get('/inventory/photo/:file', async (req, res, next) => {
  try {
    const file = path.basename(str(req.params.file, 160));       // no traversal
    const full = path.join(UPLOADS, file);
    if (!full.startsWith(UPLOADS) || !fs.existsSync(full)) return res.status(404).end();
    res.type(path.extname(file).slice(1) || 'jpg').setHeader('Cache-Control', 'private, max-age=86400');
    fs.createReadStream(full).pipe(res);
  } catch (err) { next(err); }
});

router.delete('/inventory/photo/:id(\\d+)', async (req, res, next) => {
  try {
    const [[p]] = await pool.query('SELECT * FROM inventory_photos WHERE id = ?', [Number(req.params.id)]);
    if (!p) return res.status(404).json({ error: 'Not found' });
    await pool.execute('DELETE FROM inventory_photos WHERE id = ?', [p.id]);
    await fsp.unlink(path.join(UPLOADS, p.file)).catch(() => {});
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch('/inventory/photo/:id(\\d+)', async (req, res, next) => {
  try {
    const b = req.body || {}; const sets = []; const args = [];
    if (KINDS.includes(b.kind)) { sets.push('kind = ?'); args.push(b.kind); }
    if ('caption' in b) { sets.push('caption = ?'); args.push(str(b.caption, 200)); }
    if ('sort' in b) { sets.push('sort = ?'); args.push(int(b.sort, 0)); }
    if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
    await pool.execute(`UPDATE inventory_photos SET ${sets.join(', ')} WHERE id = ?`, [...args, Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
