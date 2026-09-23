-- 019: liability waivers signed online or on a tablet, sailings, and who is
-- actually aboard.

CREATE TABLE IF NOT EXISTS waivers (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  contact_id      INT UNSIGNED NULL,

  name            VARCHAR(160) NOT NULL,
  email           VARCHAR(254) NOT NULL DEFAULT '',
  phone           VARCHAR(40)  NOT NULL DEFAULT '',
  address         VARCHAR(300) NOT NULL DEFAULT '',
  city            VARCHAR(120) NOT NULL DEFAULT '',
  dob             DATE NULL,
  emergency_name  VARCHAR(160) NOT NULL DEFAULT '',
  emergency_phone VARCHAR(40)  NOT NULL DEFAULT '',
  minors          VARCHAR(600) NOT NULL DEFAULT '',   -- names/ages of minors in the signer's care

  -- What was agreed to, and the proof of it (RCW 19.360 / E-SIGN).
  signed_name     VARCHAR(160) NOT NULL,              -- typed, under the signature
  signature       MEDIUMTEXT NULL,                    -- PNG data URL of the drawn signature
  waiver_version  VARCHAR(20)  NOT NULL,
  waiver_sha      CHAR(64)     NOT NULL,              -- hash of the exact text signed
  guardian        TINYINT(1)   NOT NULL DEFAULT 0,    -- signing for minors as parent/guardian
  photo_ok        TINYINT(1)   NOT NULL DEFAULT 1,
  optin           TINYINT(1)   NOT NULL DEFAULT 0,

  method          ENUM('online','kiosk','paper') NOT NULL DEFAULT 'online',
  ip              VARCHAR(45)  NULL,
  user_agent      VARCHAR(300) NOT NULL DEFAULT '',

  pass_code       CHAR(8) NOT NULL,                   -- what the QR encodes
  expires_on      DATE NULL,                          -- waivers are good for one season
  revoked_at      TIMESTAMP NULL DEFAULT NULL,

  UNIQUE KEY uq_pass (pass_code),
  INDEX idx_email (email),
  INDEX idx_contact (contact_id),
  CONSTRAINT fk_waiver_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A day's sailing, open ship or work party: whatever we count heads for.
CREATE TABLE IF NOT EXISTS sailings (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sail_date   DATE NOT NULL,
  title       VARCHAR(160) NOT NULL DEFAULT '',
  location    VARCHAR(160) NOT NULL DEFAULT '',
  capacity    SMALLINT UNSIGNED NOT NULL DEFAULT 0,   -- 0 = no stated limit
  notes       VARCHAR(600) NOT NULL DEFAULT '',
  status      ENUM('planned','boarding','underway','closed') NOT NULL DEFAULT 'planned',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED NULL,
  INDEX idx_date (sail_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per person per sailing: on board when checked_in_at is set and
-- checked_out_at is not.
CREATE TABLE IF NOT EXISTS sailing_checkins (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sailing_id     INT UNSIGNED NOT NULL,
  waiver_id      INT UNSIGNED NULL,
  name           VARCHAR(160) NOT NULL,
  email          VARCHAR(254) NOT NULL DEFAULT '',
  party_size     TINYINT UNSIGNED NOT NULL DEFAULT 1,  -- signer plus minors in their care
  role           ENUM('guest','crew','volunteer') NOT NULL DEFAULT 'guest',
  registered_at  TIMESTAMP NULL DEFAULT NULL,          -- pre-registered
  checked_in_at  TIMESTAMP NULL DEFAULT NULL,
  checked_out_at TIMESTAMP NULL DEFAULT NULL,
  method         ENUM('qr','manual','kiosk','prereg') NOT NULL DEFAULT 'manual',
  by_user        INT UNSIGNED NULL,
  note           VARCHAR(300) NOT NULL DEFAULT '',
  UNIQUE KEY uq_sailing_waiver (sailing_id, waiver_id),
  INDEX idx_sailing (sailing_id),
  CONSTRAINT fk_ci_sailing FOREIGN KEY (sailing_id) REFERENCES sailings(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_waiver FOREIGN KEY (waiver_id) REFERENCES waivers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "Waiver on file" in the CRM.
ALTER TABLE contacts
  ADD COLUMN waiver_signed_on DATE NULL AFTER optin,
  ADD COLUMN waiver_expires_on DATE NULL AFTER waiver_signed_on;
