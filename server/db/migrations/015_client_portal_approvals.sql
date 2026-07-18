ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS public_share_approvals BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS portal_approvals (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  row_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_approvals_table_row
  ON portal_approvals(table_id, row_id, created_at DESC);
