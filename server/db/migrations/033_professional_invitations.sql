CREATE TABLE IF NOT EXISTS professional_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  table_id TEXT NOT NULL,
  inviter_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  workspace_role TEXT NOT NULL DEFAULT 'member',
  board_role TEXT NOT NULL DEFAULT 'viewer',
  job_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  portal_type TEXT NOT NULL DEFAULT 'standard',
  record_access JSONB NOT NULL DEFAULT '{"scope":"all_permitted"}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  notification_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS professional_invitations_pending_unique_idx
  ON professional_invitations(workspace_id, table_id, inviter_id, recipient_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS professional_invitations_recipient_status_idx
  ON professional_invitations(recipient_id, status, created_at DESC);
