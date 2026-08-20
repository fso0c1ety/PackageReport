DROP INDEX IF EXISTS idx_notifications_dedupe_key;
ALTER TABLE notifications DROP COLUMN IF EXISTS dedupe_key;
