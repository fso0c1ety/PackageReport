CREATE TABLE IF NOT EXISTS direct_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_recipient_timestamp
  ON direct_messages(sender_id, recipient_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_read_timestamp
  ON direct_messages(recipient_id, read, timestamp DESC);
