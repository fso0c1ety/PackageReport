-- Forward repair; keep legacy workspace_modules JSON storage unchanged.
-- Apply only through a reviewed transaction after backup/restore and ledger reconciliation.
-- Phase 1 universal engine. Additive only; legacy tables/rows remain authoritative.
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS enabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_view_id TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE rows
  ADD COLUMN IF NOT EXISTS group_id TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS position NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS board_views (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'table',
  visibility TEXT NOT NULL DEFAULT 'workspace',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS row_relations (
  id TEXT PRIMARY KEY,
  source_row_id TEXT NOT NULL REFERENCES rows(id) ON DELETE CASCADE,
  source_column_id TEXT NOT NULL,
  target_table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  target_row_id TEXT NOT NULL REFERENCES rows(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_row_id, source_column_id, target_row_id)
);

CREATE TABLE IF NOT EXISTS dashboards (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id TEXT PRIMARY KEY,
  dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_filters (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_board_views_table_id ON board_views(table_id);
CREATE INDEX IF NOT EXISTS idx_rows_group_position ON rows(table_id, group_id, position);
CREATE INDEX IF NOT EXISTS idx_row_relations_source ON row_relations(source_row_id, source_column_id);
CREATE INDEX IF NOT EXISTS idx_row_relations_target ON row_relations(target_table_id, target_row_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_workspace ON dashboards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_table ON saved_filters(table_id);


ALTER TABLE automation_runs ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS automation_runs_automation_created_idx ON automation_runs(automation_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_created ON workspaces(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tables_workspace_created ON tables(workspace_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rows_table_created ON rows(table_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS workspace_members_user_role_idx ON workspace_members(user_id,role);
CREATE INDEX IF NOT EXISTS trip_status_history_trip_idx ON trip_status_history(workspace_id,trip_id,created_at DESC);
CREATE TABLE IF NOT EXISTS portal_approvals (
 id TEXT PRIMARY KEY, table_id TEXT NOT NULL, row_id TEXT NOT NULL,
 client_name TEXT NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('approved','changes_requested')),
 note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_approvals_table_row ON portal_approvals(table_id,row_id,created_at DESC);
-- Preserve backend ownership/grants; newly repaired tables are server-only.
DO $$ DECLARE target text; api_role text;
BEGIN
 FOREACH target IN ARRAY ARRAY['board_views','row_relations','dashboards','dashboard_widgets','saved_filters','user_preferences','portal_approvals'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',target);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC',target);
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=api_role) THEN
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I',target,api_role);
   END IF;
  END LOOP;
 END LOOP;
END $$;
