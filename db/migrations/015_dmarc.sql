-- 015: DMARC aggregate reports, uploaded through the portal.

CREATE TABLE IF NOT EXISTS dmarc_reports (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  report_id   VARCHAR(190) NOT NULL,              -- the provider's own id
  org_name    VARCHAR(120) NOT NULL,              -- google.com, Outlook.com, …
  domain      VARCHAR(190) NOT NULL,
  policy      VARCHAR(20) NOT NULL DEFAULT '',    -- p= at the time of the report
  begins_at   TIMESTAMP NULL DEFAULT NULL,
  ends_at     TIMESTAMP NULL DEFAULT NULL,
  uploaded_by INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_report (org_name, report_id),     -- re-uploading the same file is a no-op
  INDEX idx_range (ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dmarc_rows (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  report_id    INT UNSIGNED NOT NULL,
  source_ip    VARCHAR(45) NOT NULL,
  count        INT UNSIGNED NOT NULL DEFAULT 0,
  disposition  VARCHAR(20) NOT NULL DEFAULT 'none',
  dkim         VARCHAR(10) NOT NULL DEFAULT 'fail',   -- aligned result
  spf          VARCHAR(10) NOT NULL DEFAULT 'fail',
  header_from  VARCHAR(190) NOT NULL DEFAULT '',
  dkim_domains VARCHAR(255) NOT NULL DEFAULT '',      -- domains that passed DKIM
  spf_domains  VARCHAR(255) NOT NULL DEFAULT '',
  FOREIGN KEY (report_id) REFERENCES dmarc_reports(id) ON DELETE CASCADE,
  INDEX idx_ip (source_ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
