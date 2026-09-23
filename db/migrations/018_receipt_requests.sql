-- 018: online donation-receipt requests. Mirrors the printable receipt form
-- (frontend/print/donation-receipt.html) so a request can be issued as a
-- receipt without re-keying anything.

CREATE TABLE IF NOT EXISTS receipt_requests (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Donor
  donor_name     VARCHAR(160) NOT NULL,
  address        VARCHAR(300) NOT NULL DEFAULT '',
  email          VARCHAR(254) NOT NULL,
  phone          VARCHAR(40)  NOT NULL DEFAULT '',

  -- Contribution
  gift_kind      ENUM('cash','noncash') NOT NULL DEFAULT 'cash',
  received_on    DATE NULL,
  amount         DECIMAL(10,2) NULL,                    -- cash gifts
  method         VARCHAR(40)  NOT NULL DEFAULT '',      -- check, card, Givebutter, cash…
  check_no       VARCHAR(40)  NOT NULL DEFAULT '',
  description    VARCHAR(1000) NOT NULL DEFAULT '',     -- non-cash: what was given
  restricted_for VARCHAR(200) NOT NULL DEFAULT '',      -- blank = unrestricted

  -- Goods or services (IRS Pub 1771)
  goods          TINYINT(1) NOT NULL DEFAULT 0,
  goods_desc     VARCHAR(300) NOT NULL DEFAULT '',
  goods_value    DECIMAL(10,2) NULL,

  note           VARCHAR(1000) NOT NULL DEFAULT '',
  ip             VARCHAR(45) NULL,

  -- Issuing
  status         ENUM('new','issued','declined') NOT NULL DEFAULT 'new',
  receipt_no     VARCHAR(20) NULL,
  issued_at      TIMESTAMP NULL DEFAULT NULL,
  issued_by      INT UNSIGNED NULL,
  issuer_name    VARCHAR(120) NOT NULL DEFAULT '',
  issuer_title   VARCHAR(120) NOT NULL DEFAULT '',
  admin_note     VARCHAR(1000) NOT NULL DEFAULT '',

  UNIQUE KEY uq_receipt_no (receipt_no),
  INDEX idx_status (status),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
