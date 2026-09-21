-- 011: mail blasts from the portal, per-recipient outcomes, SES event log.

CREATE TABLE IF NOT EXISTS blasts (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  subject       VARCHAR(200) NOT NULL,
  preheader     VARCHAR(200) NOT NULL DEFAULT '',
  body          TEXT NOT NULL,                       -- author's plain text (see mail-template.js)
  image         VARCHAR(120) NULL,                   -- hero image basename under /images
  audience      JSON NOT NULL,                       -- the picker settings used to build the list
  status        ENUM('draft','sending','paused','done','failed') NOT NULL DEFAULT 'draft',
  total         INT UNSIGNED NOT NULL DEFAULT 0,
  sent          INT UNSIGNED NOT NULL DEFAULT 0,
  failed        INT UNSIGNED NOT NULL DEFAULT 0,
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at    TIMESTAMP NULL DEFAULT NULL,
  finished_at   TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blast_recipients (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  blast_id         INT UNSIGNED NOT NULL,
  email            VARCHAR(254) NOT NULL,
  name             VARCHAR(160) NOT NULL DEFAULT '',
  contact_email_id INT UNSIGNED NULL,                -- back-reference into the CRM, if from there
  status           ENUM('queued','sent','failed','bounced','complained') NOT NULL DEFAULT 'queued',
  error            VARCHAR(300) NOT NULL DEFAULT '',
  message_id       VARCHAR(120) NULL,                -- SES message id, matched by bounce events
  sent_at          TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_blast_email (blast_id, email),
  INDEX idx_msg (message_id),
  INDEX idx_status (blast_id, status),
  CONSTRAINT fk_br_blast FOREIGN KEY (blast_id) REFERENCES blasts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Raw SES notifications (bounce / complaint / delivery) for audit.
CREATE TABLE IF NOT EXISTS ses_events (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event_type  VARCHAR(40) NOT NULL,
  message_id  VARCHAR(120) NULL,
  email       VARCHAR(254) NULL,
  detail      TEXT NULL,
  INDEX idx_msg (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
