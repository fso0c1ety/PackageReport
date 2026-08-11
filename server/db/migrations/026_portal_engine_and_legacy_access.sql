BEGIN;

-- Normalize legacy data before any route expands shared_users with jsonb_array_elements.
UPDATE tables
SET shared_users = CASE
  WHEN shared_users IS NULL THEN '[]'::jsonb
  WHEN jsonb_typeof(shared_users) = 'array' THEN shared_users
  WHEN jsonb_typeof(shared_users) = 'object' THEN jsonb_build_array(shared_users)
  ELSE '[]'::jsonb
END
WHERE shared_users IS NULL OR jsonb_typeof(shared_users) <> 'array';

ALTER TABLE tables ALTER COLUMN shared_users SET DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS portal_definitions (
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  name TEXT NOT NULL,
  portal_type TEXT NOT NULL,
  template_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  job_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  config JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, version),
  CHECK (jsonb_typeof(template_ids) = 'array'),
  CHECK (jsonb_typeof(job_roles) = 'array'),
  CHECK (jsonb_typeof(config) = 'object')
);

CREATE TABLE IF NOT EXISTS workspace_portal_overrides (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  portal_id TEXT NOT NULL,
  portal_version INTEGER NOT NULL,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, portal_id),
  FOREIGN KEY (portal_id, portal_version) REFERENCES portal_definitions(id, version),
  CHECK (jsonb_typeof(overrides) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_portal_definitions_type_enabled
  ON portal_definitions(portal_type, enabled);
CREATE INDEX IF NOT EXISTS idx_workspace_portal_overrides_workspace
  ON workspace_portal_overrides(workspace_id, enabled);

COMMIT;
