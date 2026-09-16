const express = require('express');
const pool = require('../db');
const { notify } = require('../mailer');
const { str, email, isHoneypotTripped } = require('../validate');

const router = express.Router();

const OK_MSG = 'Thank you — we received your message and will be in touch.';

// POST /api/contact
router.post('/contact', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (isHoneypotTripped(b)) return res.json({ message: OK_MSG });

    const name = str(b.name, 120);
    const from = email(b.email);
    const topic = str(b.topic, 80);
    const message = str(b.message, 5000);
    if (!name || !from || !message) {
      return res.status(400).json({ error: 'Name, a valid email and a message are required.' });
    }

    await pool.execute(
      'INSERT INTO contact_messages (name, email, topic, message, ip) VALUES (?, ?, ?, ?, ?)',
      [name, from, topic, message, req.ip]
    );
    notify(
      `[tug202.com] Contact: ${topic || 'General'} — ${name}`,
      `From: ${name} <${from}>\nTopic: ${topic}\n\n${message}`,
      from
    );
    res.json({ message: OK_MSG });
  } catch (err) { next(err); }
});

// POST /api/volunteer
router.post('/volunteer', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (isHoneypotTripped(b)) return res.json({ message: OK_MSG });

    const name = str(b.name, 120);
    const from = email(b.email);
    const phone = str(b.phone, 40);
    const interests = Array.isArray(b.interests)
      ? b.interests.map(i => str(i, 60)).filter(Boolean).slice(0, 12).join(', ')
      : str(b.interests, 400);
    const experience = str(b.experience, 3000);
    const availability = str(b.availability, 300);
    if (!name || !from) {
      return res.status(400).json({ error: 'Name and a valid email are required.' });
    }

    await pool.execute(
      'INSERT INTO volunteer_signups (name, email, phone, interests, experience, availability, ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, from, phone, interests, experience, availability, req.ip]
    );
    notify(
      `[tug202.com] Volunteer signup — ${name}`,
      `Name: ${name}\nEmail: ${from}\nPhone: ${phone}\nInterests: ${interests}\nAvailability: ${availability}\n\nExperience:\n${experience}`,
      from
    );
    res.json({ message: 'Welcome aboard — a board member will follow up with upcoming work days.' });
  } catch (err) { next(err); }
});

// POST /api/partner — partnership inquiry from the /partner page.
router.post('/partner', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (isHoneypotTripped(b)) return res.json({ message: OK_MSG });

    const orgName = str(b.orgName, 200);
    const contactName = str(b.contactName, 120);
    const from = email(b.email);
    const phone = str(b.phone, 40);
    const purpose = str(b.purpose, 5000);
    const headcount = str(b.headcount, 40);
    const location = str(b.location, 200);
    const dates = str(b.dates, 200);
    const mode = str(b.mode, 60);
    const duration = str(b.duration, 200);
    const accessibility = str(b.accessibility, 2000);
    const equipment = str(b.equipment, 3000);
    const resources = str(b.resources, 3000);
    if (!orgName || !contactName || !from || !purpose) {
      return res.status(400).json({ error: 'Organization, contact name, a valid email and a description of the project are required.' });
    }

    await pool.execute(
      `INSERT INTO partner_inquiries
         (org_name, contact_name, email, phone, purpose, headcount, location, dates, mode, duration, accessibility, equipment, resources, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orgName, contactName, from, phone, purpose, headcount, location, dates, mode, duration, accessibility, equipment, resources, req.ip]
    );
    notify(
      `[tug202.com] Partnership inquiry — ${orgName}`,
      [
        `Organization: ${orgName}`, `Contact: ${contactName} <${from}> ${phone}`,
        `Participants: ${headcount}`, `Location: ${location}`, `Dates: ${dates}`,
        `Underway/dockside: ${mode}`, `Duration: ${duration}`, '',
        `Purpose:\n${purpose}`, '', `Accessibility: ${accessibility}`, '',
        `Food/media/equipment:\n${equipment}`, '', `Resources offered:\n${resources}`
      ].join('\n'),
      from
    );
    res.json({ message: 'Thank you — we received your inquiry. A board member will follow up to talk through the project.' });
  } catch (err) { next(err); }
});

// POST /api/newsletter
router.post('/newsletter', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (isHoneypotTripped(b)) return res.json({ message: 'Subscribed.' });

    const from = email(b.email);
    if (!from) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const name = str(b.name, 120);
    const note = str(b.note, 500);
    const p = (b.prefs && typeof b.prefs === 'object') ? b.prefs : {};
    // Absent prefs object (old clients) = newsletter only.
    const prefs = {
      newsletter: 'newsletter' in p ? !!p.newsletter : true,
      volunteer: !!p.volunteer,
      events: !!p.events,
      reunions: !!p.reunions
    };
    if (!Object.values(prefs).some(Boolean)) {
      return res.status(400).json({ error: 'Pick at least one kind of email to receive.' });
    }

    // Re-signup updates preferences (and clears an old unsubscribe) instead of erroring.
    await pool.execute(
      `INSERT INTO newsletter_subscribers
         (email, name, pref_newsletter, pref_volunteer, pref_events, pref_reunions, note, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = IF(VALUES(name) = '', name, VALUES(name)),
         pref_newsletter = VALUES(pref_newsletter),
         pref_volunteer  = VALUES(pref_volunteer),
         pref_events     = VALUES(pref_events),
         pref_reunions   = VALUES(pref_reunions),
         note = IF(VALUES(note) = '', note, VALUES(note)),
         unsubscribed_at = NULL`,
      [from, name, prefs.newsletter ? 1 : 0, prefs.volunteer ? 1 : 0, prefs.events ? 1 : 0, prefs.reunions ? 1 : 0, note, req.ip]
    );
    const chosen = Object.entries(prefs).filter(([, v]) => v).map(([k]) => k).join(', ');
    if (prefs.volunteer || note) {
      notify(
        `[tug202.com] List signup — ${name || from}`,
        `Email: ${from}
Name: ${name}
Wants: ${chosen}
Note: ${note}`,
        from
      );
    }
    res.json({ message: 'You’re on the list — thank you. Watch for ship’s mail.' });
  } catch (err) { next(err); }
});

module.exports = router;
