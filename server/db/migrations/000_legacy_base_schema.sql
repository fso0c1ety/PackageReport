-- Legacy PackageReport base schema for fresh local/production databases.
-- Existing deployments with these tables are left untouched.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar TEXT,
  password TEXT,
  fcm_token TEXT,
  fcm_tokens JSONB DEFAULT '[]'::jsonb,
  phone TEXT,
  job_title TEXT,
  company TEXT,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  columns JSONB DEFAULT '[]'::jsonb,
  shared_users JSONB DEFAULT '[]'::jsonb,
  invite_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rows (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  values JSONB DEFAULT '{}'::jsonb,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipients JSONB DEFAULT '[]'::jsonb,
  subject TEXT,
  html TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  table_id TEXT REFERENCES tables(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES rows(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent',
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS table_chats (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  sender TEXT,
  sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  text TEXT,
  attachment JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS automations (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  name TEXT,
  trigger JSONB DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  enabled BOOLEAN DEFAULT TRUE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tables_workspace_id_base ON tables(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rows_table_id_base ON rows(table_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id_base ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_table_chats_table_id_base ON table_chats(table_id);
