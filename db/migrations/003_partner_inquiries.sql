-- 003: partnership inquiry form (/partner page).

CREATE TABLE IF NOT EXISTS partner_inquiries (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  org_name      VARCHAR(200) NOT NULL,
  contact_name  VARCHAR(120) NOT NULL,
  email         VARCHAR(254) NOT NULL,
  phone         VARCHAR(40)  NOT NULL DEFAULT '',
  purpose       TEXT NOT NULL,
  headcount     VARCHAR(40)  NOT NULL DEFAULT '',
  location      VARCHAR(200) NOT NULL DEFAULT '',
  dates         VARCHAR(200) NOT NULL DEFAULT '',
  mode          VARCHAR(60)  NOT NULL DEFAULT '',
  duration      VARCHAR(200) NOT NULL DEFAULT '',
  accessibility TEXT NULL,
  equipment     TEXT NULL,
  resources     TEXT NULL,
  ip            VARCHAR(45)  NULL,
  handled_at    TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
