-- Admin-approved, retry-safe prospect demo provisioning.
ALTER TABLE demo_requests
  ADD COLUMN IF NOT EXISTS prospect_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provisioned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_email_status TEXT NOT NULL DEFAULT 'not_sent'
    CHECK (access_email_status IN ('not_sent','pending','sent','failed')),
  ADD COLUMN IF NOT EXISTS access_email_last_error TEXT,
  ADD COLUMN IF NOT EXISTS access_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conversion_started_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS demo_request_events (
  id UUID PRIMARY KEY,
  demo_request_id UUID NOT NULL REFERENCES demo_requests(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data)='object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_request_events_request_created
  ON demo_request_events(demo_request_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_demo_request_workspace_unique
  ON workspaces(demo_request_id) WHERE demo_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demo_requests_prospect_user
  ON demo_requests(prospect_user_id) WHERE prospect_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION smart_manage_demo_write_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_workspace TEXT;
BEGIN
  IF TG_TABLE_NAME='rows' THEN
    SELECT workspace_id INTO target_workspace FROM tables WHERE id=COALESCE(NEW.table_id,OLD.table_id);
  ELSE
    target_workspace := COALESCE(NEW.workspace_id,OLD.workspace_id);
  END IF;
  IF EXISTS (SELECT 1 FROM workspaces w WHERE w.id=target_workspace AND w.is_demo=TRUE
    AND (w.demo_expires_at<=NOW() OR COALESCE((w.demo_metadata->>'revoked')::boolean,FALSE)=TRUE)) THEN
    RAISE EXCEPTION 'demo workspace is expired or revoked';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_demo_rows_write_guard ON rows;
CREATE TRIGGER trg_demo_rows_write_guard BEFORE INSERT OR UPDATE OR DELETE ON rows
  FOR EACH ROW EXECUTE FUNCTION smart_manage_demo_write_guard();
DROP TRIGGER IF EXISTS trg_demo_tables_write_guard ON tables;
CREATE TRIGGER trg_demo_tables_write_guard BEFORE INSERT OR UPDATE OR DELETE ON tables
  FOR EACH ROW EXECUTE FUNCTION smart_manage_demo_write_guard();
