CREATE INDEX IF NOT EXISTS idx_workspaces_owner_created
  ON workspaces(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tables_workspace_created
  ON tables(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rows_table_created
  ON rows(table_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications(recipient_id, created_at DESC);
