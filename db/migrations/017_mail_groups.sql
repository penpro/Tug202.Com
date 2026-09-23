-- 017: mail groups (topics). One row per address says which kinds of mail it
-- wants. Website signups have had these since 004; this makes them apply to
-- everyone, including the CRM addresses off the paper boarding sheets.

CREATE TABLE IF NOT EXISTS mail_prefs (
  email      VARCHAR(254) NOT NULL PRIMARY KEY,
  newsletter TINYINT(1) NOT NULL DEFAULT 1,   -- ship's newsletter
  volunteer  TINYINT(1) NOT NULL DEFAULT 1,   -- work-day calls
  events     TINYINT(1) NOT NULL DEFAULT 1,   -- open ship, cruises
  reunions   TINYINT(1) NOT NULL DEFAULT 1,   -- former crew
  source     VARCHAR(20) NOT NULL DEFAULT 'seed',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Everyone already in the CRM goes into every group (they signed up before we
-- asked which kind); the preference centre lets them narrow it from here.
INSERT IGNORE INTO mail_prefs (email, newsletter, volunteer, events, reunions, source)
  SELECT DISTINCT email, 1, 1, 1, 1, 'crm' FROM contact_emails;

-- Website signups keep the boxes they actually ticked.
INSERT INTO mail_prefs (email, newsletter, volunteer, events, reunions, source)
  SELECT email, pref_newsletter, pref_volunteer, pref_events, pref_reunions, 'signup'
  FROM newsletter_subscribers
ON DUPLICATE KEY UPDATE
  newsletter = VALUES(newsletter), volunteer = VALUES(volunteer),
  events = VALUES(events), reunions = VALUES(reunions), source = 'signup';

ALTER TABLE blasts
  ADD COLUMN topic VARCHAR(20) NOT NULL DEFAULT '' AFTER cta_url,        -- which group this mailing is
  ADD COLUMN confirm_button TINYINT(1) NOT NULL DEFAULT 1 AFTER topic;   -- show "keep me on the list"
