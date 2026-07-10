-- Smart Manage core SaaS schema compatibility migration.
-- Safe to run repeatedly; preserves existing tables/rows JSONB model while adding
-- normalized monday.com-style tables for future incremental migration.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS fcm_tokens JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS shared_users JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE rows
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS board_groups (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_columns (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, key)
);

CREATE TABLE IF NOT EXISTS cell_values (
  row_id TEXT NOT NULL REFERENCES rows(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  value JSONB DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (row_id, column_id)
);

CREATE TABLE IF NOT EXISTS item_comments (
  id TEXT PRIMARY KEY,
  row_id TEXT NOT NULL REFERENCES rows(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  attachment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY,
  table_id TEXT,
  row_id TEXT,
  uploaded_by TEXT,
  filename TEXT UNIQUE,
  originalname TEXT,
  mimetype TEXT,
  size BIGINT,
  storage_provider TEXT DEFAULT 'database',
  storage_path TEXT,
  data BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id TEXT PRIMARY KEY,
  automation_id TEXT,
  table_id TEXT,
  row_id TEXT,
  idempotency_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE table_chats ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE table_chats ADD COLUMN IF NOT EXISTS attachment JSONB;

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tables_workspace_id ON tables(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tables_invite_code ON tables(invite_code);
CREATE INDEX IF NOT EXISTS idx_rows_table_id ON rows(table_id);
CREATE INDEX IF NOT EXISTS idx_rows_created_by ON rows(created_by);
CREATE INDEX IF NOT EXISTS idx_rows_created_at ON rows(created_at);
CREATE INDEX IF NOT EXISTS idx_board_groups_table_id ON board_groups(table_id);
CREATE INDEX IF NOT EXISTS idx_board_columns_table_id ON board_columns(table_id);
CREATE INDEX IF NOT EXISTS idx_cell_values_column_id ON cell_values(column_id);
CREATE INDEX IF NOT EXISTS idx_item_comments_row_id ON item_comments(row_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_table_id ON uploaded_files(table_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_row_id ON uploaded_files(row_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_table_id ON activity_logs(table_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_id ON activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation_id ON automation_runs(automation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, read, created_at DESC);
