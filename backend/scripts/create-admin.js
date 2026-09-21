#!/usr/bin/env node
// Create (or re-invite / promote) a portal admin and print a one-time setup link.
//   node scripts/create-admin.js wesleyaweaverjr@gmail.com "Wesley Weaver"
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../db');
const { issueToken } = require('../auth');

const [email, name = ''] = process.argv.slice(2);
if (!email) { console.error('usage: create-admin.js <email> [name]'); process.exit(1); }

(async () => {
  const e = email.trim().toLowerCase();
  const [[u]] = await pool.query('SELECT id FROM users WHERE email = ?', [e]);
  let id = u?.id;
  if (!id) {
    const [r] = await pool.execute('INSERT INTO users (email, name, role) VALUES (?, ?, "admin")', [e, name]);
    id = r.insertId; console.log(`created admin ${e} (#${id})`);
  } else {
    await pool.execute('UPDATE users SET role = "admin", is_active = 1 WHERE id = ?', [id]);
    console.log(`existing user ${e} (#${id}) is now an active admin`);
  }
  console.log('\nSetup link (valid 7 days, single use):\n  ' + await issueToken(id, 'setup') + '\n');
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
