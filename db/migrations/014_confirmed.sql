-- 014: recipients can click "keep me on the list"; counted per blast.
ALTER TABLE blast_recipients
  MODIFY status ENUM('queued','sent','failed','bounced','complained','confirmed') NOT NULL DEFAULT 'queued',
  ADD COLUMN confirmed_at TIMESTAMP NULL DEFAULT NULL AFTER sent_at;
