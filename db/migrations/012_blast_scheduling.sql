-- 012: blast pacing + scheduling.

ALTER TABLE blasts
  MODIFY status ENUM('draft','scheduled','sending','paused','done','failed') NOT NULL DEFAULT 'draft',
  ADD COLUMN rate_per_minute SMALLINT UNSIGNED NOT NULL DEFAULT 30 AFTER audience,   -- messages per minute while sending
  ADD COLUMN daily_cap       SMALLINT UNSIGNED NOT NULL DEFAULT 0  AFTER rate_per_minute, -- 0 = no cap
  ADD COLUMN scheduled_at    TIMESTAMP NULL DEFAULT NULL AFTER daily_cap;
