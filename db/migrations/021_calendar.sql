-- 021: the calendar. A sailing becomes an event that is either a cruise or a
-- work day; cruises keep the check-in and manifest machinery, work days just
-- gather a sign-up list. Both get a public page and a QR code that points at
-- it, so a poster on the pier or a phone held up at an event leads straight to
-- the sign-up form.

ALTER TABLE sailings
  ADD COLUMN kind ENUM('cruise','workday') NOT NULL DEFAULT 'cruise' AFTER id,
  ADD COLUMN end_date     DATE NULL              AFTER sail_date,   -- multi-day events
  ADD COLUMN boarding_at  TIME NULL              AFTER end_date,
  ADD COLUMN depart_at    TIME NULL              AFTER boarding_at,
  ADD COLUMN return_at    TIME NULL              AFTER depart_at,
  ADD COLUMN disembark_at TIME NULL              AFTER return_at,
  ADD COLUMN description  TEXT NULL              AFTER notes,       -- shown publicly
  ADD COLUMN route        VARCHAR(800) NOT NULL DEFAULT '' AFTER description,
  ADD COLUMN donation     VARCHAR(120) NOT NULL DEFAULT '' AFTER route,
  ADD COLUMN sponsor      VARCHAR(160) NOT NULL DEFAULT '' AFTER donation,
  ADD COLUMN sponsor_info TEXT NULL              AFTER sponsor,     -- copy from the sponsor
  ADD COLUMN bring        VARCHAR(800) NOT NULL DEFAULT '' AFTER sponsor_info,  -- work day
  ADD COLUMN goals        TEXT NULL              AFTER bring,                   -- work day
  ADD COLUMN signup_code  CHAR(8) NULL           AFTER goals,
  ADD COLUMN published    TINYINT(1) NOT NULL DEFAULT 0 AFTER signup_code,
  ADD COLUMN news_post_id INT UNSIGNED NULL      AFTER published,
  ADD UNIQUE KEY uq_signup (signup_code);

-- Existing rows are cruises and need a code.
UPDATE sailings SET signup_code = UPPER(SUBSTRING(SHA2(CONCAT(id, RAND()), 256), 1, 8)) WHERE signup_code IS NULL;

-- Work-day sign-ups and cruise registrations share one roster table; a work
-- day simply never gets checked in.
ALTER TABLE sailing_checkins
  ADD COLUMN bringing VARCHAR(300) NOT NULL DEFAULT '' AFTER note,   -- "I can bring a grinder"
  ADD COLUMN skills   VARCHAR(300) NOT NULL DEFAULT '' AFTER bringing;
