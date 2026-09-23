-- 016: optional call-to-action button on a blast (donate, RSVP, read more).
ALTER TABLE blasts
  ADD COLUMN cta_label VARCHAR(60) NOT NULL DEFAULT '' AFTER image,
  ADD COLUMN cta_url   VARCHAR(300) NOT NULL DEFAULT '' AFTER cta_label;
