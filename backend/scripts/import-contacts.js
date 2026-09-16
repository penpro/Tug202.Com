#!/usr/bin/env node
// Import contacts from the scan-extraction CSV into the contacts tables.
// The CSV is NOT in the repo (PII); scp it to the server first, e.g.
//   scp -i 202.pem D:/ATA202/Scans/extracted/contacts.csv ubuntu@host:~/contacts.csv
//   ssh ... 'cd ~/Tug202.Com/backend && node scripts/import-contacts.js ~/contacts.csv'
// Re-runnable: rows are upserted by legacy_id, emails by (contact, email).

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const pool = require('../db');

const file = process.argv[2];
if (!file) { console.error('usage: import-contacts.js <contacts.csv>'); process.exit(1); }

// Minimal CSV parser (handles quoted fields with commas/newlines).
function parseCsv(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

function tagsFor(c) {
  const ev = c.event.toLowerCase(), notes = (c.notes || '').toLowerCase();
  const t = [];
  if (ev.includes('hnsa')) t.push('hnsa');
  if (ev.includes('port townsend') || ev.includes('port hadlock')) t.push('pt-local');
  if (ev.includes('usn') || ev.includes('navy')) t.push('navy');
  if (notes.includes('business') || notes.includes('productions')) t.push('business');
  if (c.optin === 'yes') t.push('optin');
  return t.join(',');
}

(async () => {
  const recs = parseCsv(fs.readFileSync(file, 'utf8'));
  let people = 0, emails = 0;
  for (const c of recs) {
    const notes = [c.notes, c.as_written ? `as written: ${c.as_written}` : ''].filter(Boolean).join(' | ');
    await pool.execute(
      `INSERT INTO contacts (legacy_id, name, city, address, phone, source, source_ref, event, event_date, optin, tags, notes)
       VALUES (?, ?, ?, ?, ?, 'scan', ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), city = VALUES(city), address = VALUES(address), phone = VALUES(phone),
         event = VALUES(event), event_date = VALUES(event_date), optin = VALUES(optin), tags = VALUES(tags), notes = VALUES(notes)`,
      [c.id, c.name, c.city, c.address, c.phone, c.source_page, c.event, c.date, c.optin === 'yes' ? 1 : 0, tagsFor(c), notes]
    );
    const [[{ id }]] = await pool.query('SELECT id FROM contacts WHERE legacy_id = ?', [c.id]);
    people++;
    const list = [];
    if (c.email_primary) list.push([c.email_primary, 'primary']);
    for (const e of c.email_alternates.split(';').filter(Boolean)) list.push([e, 'alternate']);
    for (const e of c.email_permutations.split(';').filter(Boolean)) list.push([e, 'permutation']);
    for (const [email, kind] of list) {
      const [r] = await pool.execute(
        'INSERT IGNORE INTO contact_emails (contact_id, email, kind, confidence) VALUES (?, ?, ?, ?)',
        [id, email, kind, c.confidence || 'low']
      );
      emails += r.affectedRows;
    }
  }
  console.log(`imported ${people} contacts, ${emails} new email rows`);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
