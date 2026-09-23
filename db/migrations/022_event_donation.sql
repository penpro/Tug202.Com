-- 022: the suggested donation as a number, so the sign-up page can total it
-- up and take people to pay it. `donation` stays as the wording shown on the
-- page ("$75 per person"); these drive the arithmetic.

ALTER TABLE sailings
  ADD COLUMN donation_amount DECIMAL(8,2) NULL AFTER donation,          -- 0/NULL = don't ask
  ADD COLUMN donation_per ENUM('person','party') NOT NULL DEFAULT 'person' AFTER donation_amount;

-- Whether they said they would give when they signed up, and how much we
-- suggested. Reconciled against Givebutter by hand — this is an intention,
-- not a payment record.
ALTER TABLE sailing_checkins
  ADD COLUMN pledged TINYINT(1) NOT NULL DEFAULT 0 AFTER skills,
  ADD COLUMN pledge_amount DECIMAL(8,2) NULL AFTER pledged;
