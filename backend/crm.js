// One door into the CRM for everything that collects an email: the website
// forms and the backfill script. Anyone who reaches us by name and address
// ends up as one person with one record, however they arrived.

const pool = require('./db');
const { KEYS: GROUP_KEYS } = require('./mail-groups');

const str = (v, n) => String(v ?? '').trim().slice(0, n);

// Add or update a person. Matching is by email: if we already hold the
// address, we fill in blanks on the existing record rather than making a
// second one, and never overwrite what's already there.
//
//   who: { email, name, city, phone, source, sourceRef, note, tags, optin }
//   opts: { prefs: {newsletter:bool,…} } — only applied for new addresses
// Returns { contactId, created }.
async function upsertContact(who, opts = {}) {
  const email = String(who.email || '').trim().toLowerCase();
  if (!email) return { contactId: null, created: false };

  const name = str(who.name, 160), city = str(who.city, 120), phone = str(who.phone, 40);
  const tags = str(who.tags, 300), note = str(who.note, 60000);
  const source = str(who.source, 60) || 'signup';

  const [[existing]] = await pool.query(
    'SELECT c.* FROM contacts c JOIN contact_emails ce ON ce.contact_id = c.id WHERE ce.email = ? LIMIT 1', [email]);

  let contactId, created = false;
  if (existing) {
    contactId = existing.id;
    // Fill gaps only. A volunteer form with a phone number improves a record
    // scanned off a boarding sheet; it must not blank out a better name.
    const sets = [], args = [];
    if (name && !existing.name) { sets.push('name = ?'); args.push(name); }
    if (city && !existing.city) { sets.push('city = ?'); args.push(city); }
    if (phone && !existing.phone) { sets.push('phone = ?'); args.push(phone); }
    if (tags) { sets.push("tags = TRIM(BOTH ',' FROM CONCAT_WS(',', NULLIF(tags, ''), ?))"); args.push(tags); }
    if (who.optin) sets.push('optin = 1');
    if (note) { sets.push("notes = TRIM(CONCAT_WS('\\n', NULLIF(notes, ''), ?))"); args.push(note); }
    if (sets.length) await pool.execute(`UPDATE contacts SET ${sets.join(', ')} WHERE id = ?`, [...args, contactId]);
  } else {
    const [ins] = await pool.execute(
      'INSERT INTO contacts (name, city, phone, source, source_ref, tags, optin, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, city, phone, source, str(who.sourceRef, 120), tags, who.optin ? 1 : 0, note || null]);
    contactId = ins.insertId; created = true;
    await pool.execute(
      "INSERT IGNORE INTO contact_emails (contact_id, email, kind, confidence, status, status_at, status_note) VALUES (?, ?, 'primary', 'high', 'confirmed', NOW(), ?)",
      [contactId, email, str(who.statusNote, 300) || 'gave us this address directly']);
  }

  // Topic preferences: only for addresses we haven't heard from before, so a
  // later form can't quietly re-subscribe someone who opted out.
  const prefs = opts.prefs;
  if (prefs) {
    const vals = GROUP_KEYS.map(k => (prefs[k] ? 1 : 0));
    await pool.execute(
      `INSERT INTO mail_prefs (email, ${GROUP_KEYS.join(', ')}, source) VALUES (?, ${GROUP_KEYS.map(() => '?').join(', ')}, ?)
       ON DUPLICATE KEY UPDATE email = email`, [email, ...vals, source]);
  } else {
    await pool.execute("INSERT IGNORE INTO mail_prefs (email, source) VALUES (?, ?)", [email, source]);
  }
  return { contactId, created };
}

module.exports = { upsertContact };
