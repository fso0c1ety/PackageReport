-- Additive schema reconciliation for tables previously created by runtime helpers.
-- Ordered after 047 and before 048. No existing migration/checksum is changed.
CREATE TABLE IF NOT EXISTS automation_action_usage (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT,
  workspace_id TEXT,
  table_id TEXT,
  run_id TEXT,
  actions INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS automation_action_usage_owner_period_idx
  ON automation_action_usage(owner_id, period_start, created_at DESC);

CREATE TABLE IF NOT EXISTS enterprise_audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  table_id TEXT,
  workspace_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_actor
  ON enterprise_audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_table
  ON enterprise_audit_logs(table_id, created_at DESC);

CREATE TABLE IF NOT EXISTS integration_webhooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  last_status INTEGER,
  last_delivery_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexus_credit_usage (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT,
  workspace_id TEXT,
  operation TEXT NOT NULL,
  credits INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS nexus_credit_usage_owner_period_idx
  ON nexus_credit_usage(owner_id, period_start, created_at DESC);

CREATE TABLE IF NOT EXISTS portal_comments (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect these five tables in the same transaction that creates them. This
-- prevents a committed 047a followed by a failed 048 from exposing them.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'automation_action_usage','enterprise_audit_logs','integration_webhooks',
    'nexus_credit_usage','portal_comments'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
    END IF;
  END LOOP;
END $$;
