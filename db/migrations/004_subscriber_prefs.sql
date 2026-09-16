-- 004: opt-in preferences + name on the email list (floating Sign up modal).

ALTER TABLE newsletter_subscribers
  ADD COLUMN name            VARCHAR(120) NOT NULL DEFAULT '' AFTER email,
  ADD COLUMN pref_newsletter TINYINT(1)   NOT NULL DEFAULT 1,
  ADD COLUMN pref_volunteer  TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN pref_events     TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN pref_reunions   TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN note            VARCHAR(500) NOT NULL DEFAULT '',
  ADD COLUMN updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
