-- 020: a real manifest. Minors are named rows, not a scribbled string, and
-- heads are counted by category so the master can answer "how many souls, and
-- who are they?" without arithmetic on the spot.

CREATE TABLE IF NOT EXISTS waiver_minors (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  waiver_id  INT UNSIGNED NOT NULL,
  name       VARCHAR(160) NOT NULL,
  age        TINYINT UNSIGNED NULL,
  INDEX idx_waiver (waiver_id),
  CONSTRAINT fk_wm_waiver FOREIGN KEY (waiver_id) REFERENCES waivers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adults and children counted apart; party_size becomes their sum.
ALTER TABLE sailing_checkins
  ADD COLUMN adults     TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER party_size,
  ADD COLUMN minor_count TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER adults;

UPDATE sailing_checkins SET adults = GREATEST(1, party_size), minor_count = 0;
