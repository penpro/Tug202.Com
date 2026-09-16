-- 001: form submission tables + news posts.

CREATE TABLE IF NOT EXISTS contact_messages (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(254) NOT NULL,
  topic       VARCHAR(80)  NOT NULL DEFAULT '',
  message     TEXT NOT NULL,
  ip          VARCHAR(45)  NULL,
  handled_at  TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS volunteer_signups (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name         VARCHAR(120) NOT NULL,
  email        VARCHAR(254) NOT NULL,
  phone        VARCHAR(40)  NOT NULL DEFAULT '',
  interests    VARCHAR(400) NOT NULL DEFAULT '',
  experience   TEXT NULL,
  availability VARCHAR(300) NOT NULL DEFAULT '',
  ip           VARCHAR(45)  NULL,
  contacted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_created (created_at),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email           VARCHAR(254) NOT NULL,
  ip              VARCHAR(45)  NULL,
  unsubscribed_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news_posts (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug         VARCHAR(120) NOT NULL,
  published_on DATE NOT NULL,
  title        VARCHAR(200) NOT NULL,
  body         TEXT NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_slug (slug),
  INDEX idx_pub (is_published, published_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
