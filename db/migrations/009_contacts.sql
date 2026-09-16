-- 009: contact list (CRM seed). One row per person; emails in a child table so
-- every candidate/permutation can be tried and marked bounced independently.
-- Data is NOT seeded by migration (PII stays out of the public repo); load it
-- with backend/scripts/import-contacts.js from a CSV copied to the server.

CREATE TABLE IF NOT EXISTS contacts (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  legacy_id    VARCHAR(16)  NULL,                          -- C001.. from the scan extraction
  name         VARCHAR(160) NOT NULL DEFAULT '',
  city         VARCHAR(120) NOT NULL DEFAULT '',
  address      VARCHAR(300) NOT NULL DEFAULT '',
  phone        VARCHAR(40)  NOT NULL DEFAULT '',
  source       VARCHAR(60)  NOT NULL DEFAULT 'scan',       -- scan | signup | volunteer | partner | manual
  source_ref   VARCHAR(120) NOT NULL DEFAULT '',           -- scan page, form id, etc.
  event        VARCHAR(160) NOT NULL DEFAULT '',
  event_date   VARCHAR(40)  NOT NULL DEFAULT '',
  optin        TINYINT(1)   NOT NULL DEFAULT 0,            -- explicit "keep me informed"
  tags         VARCHAR(300) NOT NULL DEFAULT '',           -- comma list: hnsa, pt-local, navy, business
  notes        TEXT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_legacy (legacy_id),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_emails (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  contact_id   INT UNSIGNED NOT NULL,
  email        VARCHAR(254) NOT NULL,
  kind         ENUM('primary','alternate','permutation') NOT NULL DEFAULT 'primary',
  confidence   ENUM('high','medium','low','very low') NOT NULL DEFAULT 'low',
  status       ENUM('unverified','sent','bounced','confirmed','unsubscribed') NOT NULL DEFAULT 'unverified',
  status_at    TIMESTAMP NULL DEFAULT NULL,
  status_note  VARCHAR(300) NOT NULL DEFAULT '',
  UNIQUE KEY uq_contact_email (contact_id, email),
  INDEX idx_email (email),
  INDEX idx_status (status),
  CONSTRAINT fk_ce_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
