-- Phase A: isolated marketing demos and platform-internal demo request access.
-- Additive only. Existing users and workspaces retain their current behavior.

CREATE TABLE IF NOT EXISTS platform_staff_roles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('platform_admin', 'demo_manager', 'demo_sales')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(permissions) = 'array'),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_type TEXT NOT NULL,
  team_size TEXT CHECK (team_size IS NULL OR team_size IN ('1-5', '6-20', '21-50', '51-200', '200+')),
  management_interests JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(management_interests) = 'array'),
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'demo_preparing', 'demo_ready', 'demo_sent', 'demo_completed', 'converted', 'not_interested')),
  recommended_template TEXT,
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  demo_workspace_id TEXT,
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS demo_request_id UUID,
  ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demo_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_demo_request_id_fkey') THEN
    ALTER TABLE workspaces
      ADD CONSTRAINT workspaces_demo_request_id_fkey
      FOREIGN KEY (demo_request_id) REFERENCES demo_requests(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'demo_requests_demo_workspace_id_fkey') THEN
    ALTER TABLE demo_requests
      ADD CONSTRAINT demo_requests_demo_workspace_id_fkey
      FOREIGN KEY (demo_workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_demo_metadata_object_check') THEN
    ALTER TABLE workspaces
      ADD CONSTRAINT workspaces_demo_metadata_object_check
      CHECK (jsonb_typeof(demo_metadata) = 'object');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_demo_requests_status_created
  ON demo_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email
  ON demo_requests(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_demo_requests_assigned_to
  ON demo_requests(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_workspaces_demo_owner
  ON workspaces(owner_id, is_demo) WHERE is_demo = TRUE;
CREATE INDEX IF NOT EXISTS idx_workspaces_demo_expiry
  ON workspaces(demo_expires_at) WHERE is_demo = TRUE AND demo_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_staff_active
  ON platform_staff_roles(role) WHERE active = TRUE;

CREATE OR REPLACE FUNCTION smart_manage_enforce_demo_workspace_owner()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id=NEW.owner_id AND LOWER(email)='demo@smartmanage.com')
     AND NEW.is_demo IS NOT TRUE THEN
    RAISE EXCEPTION 'demo account may only own demo workspaces';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_demo_workspace_owner ON workspaces;
CREATE TRIGGER trg_demo_workspace_owner
  BEFORE INSERT OR UPDATE OF owner_id, is_demo ON workspaces
  FOR EACH ROW EXECUTE FUNCTION smart_manage_enforce_demo_workspace_owner();

CREATE OR REPLACE FUNCTION smart_manage_enforce_demo_workspace_member()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id::text=NEW.user_id::text AND LOWER(email)='demo@smartmanage.com')
     AND NOT EXISTS (SELECT 1 FROM workspaces WHERE id=NEW.workspace_id AND is_demo=TRUE) THEN
    RAISE EXCEPTION 'demo account may only join demo workspaces';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_demo_workspace_member ON workspace_members;
CREATE TRIGGER trg_demo_workspace_member
  BEFORE INSERT OR UPDATE OF workspace_id, user_id ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION smart_manage_enforce_demo_workspace_member();

CREATE OR REPLACE FUNCTION smart_manage_enforce_demo_legacy_share()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(NEW.shared_users,'[]'::jsonb)) member
    JOIN users u ON u.id::text=COALESCE(member->>'userId', member#>>'{}')
    WHERE LOWER(u.email)='demo@smartmanage.com'
  ) AND NOT EXISTS (SELECT 1 FROM workspaces WHERE id=NEW.workspace_id AND is_demo=TRUE) THEN
    RAISE EXCEPTION 'demo account may only access demo workspaces';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_demo_legacy_share ON tables;
CREATE TRIGGER trg_demo_legacy_share
  BEFORE INSERT OR UPDATE OF workspace_id, shared_users ON tables
  FOR EACH ROW EXECUTE FUNCTION smart_manage_enforce_demo_legacy_share();

CREATE OR REPLACE FUNCTION smart_manage_enforce_demo_board_access()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id::text=NEW.user_id::text AND LOWER(email)='demo@smartmanage.com')
     AND NOT EXISTS (
       SELECT 1 FROM tables t JOIN workspaces w ON w.id=t.workspace_id
       WHERE t.id=NEW.table_id AND w.is_demo=TRUE
     ) THEN
    RAISE EXCEPTION 'demo account may only access boards in demo workspaces';
  END IF;
  RETURN NEW;
END $$;

DO $$
BEGIN
  -- Legacy deployments may not have the optional universal board-access
  -- table yet. Install this guard only when that table is present.
  IF to_regclass('public.board_member_access') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_demo_board_access ON board_member_access;
    CREATE TRIGGER trg_demo_board_access
      BEFORE INSERT OR UPDATE OF table_id, user_id ON board_member_access
      FOR EACH ROW EXECUTE FUNCTION smart_manage_enforce_demo_board_access();
  END IF;
END $$;
