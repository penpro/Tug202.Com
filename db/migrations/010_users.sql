-- 010: admin portal accounts, one-time tokens (setup / reset), server sessions.

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(254) NOT NULL,
  name          VARCHAR(120) NOT NULL DEFAULT '',
  password_hash VARCHAR(100) NULL,                         -- NULL until they finish setup
  role          ENUM('admin','editor') NOT NULL DEFAULT 'editor',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_tokens (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,                            -- sha256 of the token in the link
  purpose    ENUM('setup','reset') NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at    TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_token (token_hash),
  INDEX idx_user (user_id),
  CONSTRAINT fk_ut_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- express-mysql-session store (createDatabaseTable is off because the app
-- user has no CREATE privilege).
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) NOT NULL PRIMARY KEY,
  expires    INT UNSIGNED NOT NULL,
  data       MEDIUMTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
