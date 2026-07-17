CREATE TABLE IF NOT EXISTS ai_action_logs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  table_id TEXT, capability TEXT NOT NULL, input_summary TEXT,
  status TEXT NOT NULL DEFAULT 'success', metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_action_logs_workspace_created_idx ON ai_action_logs(workspace_id,created_at DESC);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT TRUE;
