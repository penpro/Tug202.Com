-- 013: why a blast paused itself (sandbox, quota), shown in the portal.
ALTER TABLE blasts ADD COLUMN note VARCHAR(300) NULL DEFAULT NULL AFTER scheduled_at;
