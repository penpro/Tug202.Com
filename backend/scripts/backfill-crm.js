#!/usr/bin/env node
// Pull everyone who has ever used a website form into the CRM, so the Contacts
// tab is the single list of people rather than one of four.
//
//   node scripts/backfill-crm.js            # show what would change
//   node scripts/backfill-crm.js --apply    # do it
//
// Idempotent: matching is by email, existing records only get their blanks
// filled, and an address already in the CRM is left where it is. Safe to run
// again any time (it's only needed for submissions from before the forms
// started writing to the CRM themselves).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../db');
const { upsertContact } = require('../crm');

const APPLY = process.argv.includes('--apply');

const SOURCES = [
  {
    label: 'newsletter signups',
    sql: `SELECT s.email, s.name, s.note, s.pref_newsletter, s.pref_volunteer, s.pref_events, s.pref_reunions, s.unsubscribed_at
          FROM newsletter_subscribers s LEFT JOIN contact_emails ce ON ce.email = s.email WHERE ce.email IS NULL`,
    map: (r) => ({
      who: { email: r.email, name: r.name, source: 'signup', sourceRef: 'newsletter form', note: r.note, optin: 1,
        statusNote: 'signed up on the website' },
      opts: { prefs: { newsletter: !!r.pref_newsletter, volunteer: !!r.pref_volunteer, events: !!r.pref_events, reunions: !!r.pref_reunions } },
      skip: !!r.unsubscribed_at && 'unsubscribed'
    })
  },
  {
    label: 'volunteer signups',
    sql: `SELECT v.email, v.name, v.phone, v.interests, v.availability, v.experience
          FROM volunteer_signups v LEFT JOIN contact_emails ce ON ce.email = v.email WHERE ce.email IS NULL`,
    map: (r) => ({
      who: { email: r.email, name: r.name, phone: r.phone, source: 'volunteer', sourceRef: 'volunteer form', tags: 'volunteer', optin: 1,
        note: [r.interests && `Interests: ${r.interests}`, r.availability && `Availability: ${r.availability}`, r.experience].filter(Boolean).join('\n'),
        statusNote: 'volunteered on the website' }
    })
  },
  {
    label: 'partner inquiries',
    sql: `SELECT p.email, p.contact_name, p.org_name, p.phone, p.location, p.purpose
          FROM partner_inquiries p LEFT JOIN contact_emails ce ON ce.email = p.email WHERE ce.email IS NULL`,
    map: (r) => ({
      who: { email: r.email, name: r.contact_name, phone: r.phone, city: r.location, source: 'partner', sourceRef: r.org_name, tags: 'partner',
        note: [r.org_name && `Organization: ${r.org_name}`, r.purpose].filter(Boolean).join('\n'), statusNote: 'partner inquiry on the website' }
    })
  },
  {
    label: 'portal users',
    sql: `SELECT u.email, u.name, u.role FROM users u
          LEFT JOIN contact_emails ce ON ce.email = u.email WHERE ce.email IS NULL`,
    map: (r) => ({
      who: { email: r.email, name: r.name, source: 'board', sourceRef: `portal ${r.role}`, tags: 'board', optin: 1,
        statusNote: 'board member / portal user' },
      // The board gets everything unless they say otherwise.
      opts: { prefs: { newsletter: true, volunteer: true, events: true, reunions: true } }
    })
  },
  {
    label: 'contact messages',
    sql: `SELECT m.email, m.name, m.topic FROM contact_messages m
          LEFT JOIN contact_emails ce ON ce.email = m.email WHERE ce.email IS NULL GROUP BY m.email, m.name, m.topic`,
    map: (r) => ({
      who: { email: r.email, name: r.name, source: 'contact', sourceRef: r.topic || 'contact form',
        note: r.topic && `Wrote in about: ${r.topic}`, statusNote: 'wrote to us on the website' },
      // Writing in isn't subscribing: no topics until they ask.
      opts: { prefs: { newsletter: false, volunteer: false, events: false, reunions: false } }
    })
  }
];

(async () => {
  let total = 0;
  for (const src of SOURCES) {
    const [rows] = await pool.query(src.sql);
    const seen = new Set();
    let added = 0, skipped = 0;
    for (const r of rows) {
      const m = src.map(r);
      const e = String(m.who.email || '').toLowerCase();
      if (!e || seen.has(e)) continue;      // one row per address per source
      seen.add(e);
      if (m.skip) { skipped++; continue; }
      if (APPLY) { const out = await upsertContact(m.who, m.opts || {}); if (out.created) added++; }
      else { added++; }
    }
    total += added;
    console.log(`${src.label.padEnd(20)} ${String(added).padStart(4)} ${APPLY ? 'added' : 'would add'}${skipped ? `, ${skipped} skipped (unsubscribed)` : ''}`);
  }
  const [[{ people }]] = await pool.query('SELECT COUNT(*) AS people FROM contacts');
  console.log(`\n${APPLY ? 'Done' : 'Dry run'} — ${total} ${APPLY ? 'added' : 'to add'}; CRM now holds ${people} people.`);
  if (!APPLY && total) console.log('Re-run with --apply to write them.');
  await pool.end();
})().catch(err => { console.error('error:', err.message); process.exit(1); });
