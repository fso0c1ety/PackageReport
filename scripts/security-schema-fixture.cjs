const { Client } = require('pg');

const url = process.env.DATABASE_URL;
if (!url || !/(localhost|127\.0\.0\.1|::1)/i.test(url) || /supabase\.(co|com)|production|smart_manage_prod/i.test(url)) {
  throw new Error('Security schema fixture accepts only a local PostgreSQL target');
}

const tables = [
  'automation_action_usage', 'background_job_audit', 'board_member_access',
  'demo_request_events', 'demo_requests', 'enterprise_audit_logs', 'enterprise_inquiries',
  'file_audit_log', 'integration_webhooks', 'invoice_sequences', 'nexus_credit_usage',
  'platform_staff_roles', 'portal_comments', 'portal_definitions', 'professional_invitations',
  'scheduler_locks', 'trip_status_history', 'workspace_job_roles', 'workspace_modules',
  'workspace_portal_overrides', 'password_reset_tokens', 'email_verification_tokens',
  'account_activation_tokens', 'auth_sessions', 'authentication_audit_events', 'invoices',
  'subscriptions', 'marketplace_templates', 'marketplace_reviews', 'marketplace_reports',
  'calendar_events',
];

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`
      DO $$ DECLARE role_name text;
      BEGIN
        FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name)
            THEN EXECUTE format('CREATE ROLE %I NOLOGIN', role_name);
          END IF;
        END LOOP;
      END $$;
      ALTER ROLE service_role BYPASSRLS;
      CREATE TABLE IF NOT EXISTS automation_action_usage (
        id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, actor_id TEXT, workspace_id TEXT,
        table_id TEXT, run_id TEXT, actions INTEGER NOT NULL,
        period_start TIMESTAMPTZ NOT NULL, period_end TIMESTAMPTZ NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS automation_action_usage_owner_period_idx
        ON automation_action_usage(owner_id, period_start, created_at DESC);
      CREATE TABLE IF NOT EXISTS enterprise_audit_logs (
        id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL,
        entity_type TEXT NOT NULL, entity_id TEXT, table_id TEXT, workspace_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_enterprise_audit_actor ON enterprise_audit_logs(actor_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_enterprise_audit_table ON enterprise_audit_logs(table_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS integration_webhooks (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL,
        events JSONB NOT NULL DEFAULT '[]'::jsonb, active BOOLEAN DEFAULT TRUE,
        last_status INTEGER, last_delivery_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS nexus_credit_usage (
        id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, actor_id TEXT, workspace_id TEXT,
        operation TEXT NOT NULL, credits INTEGER NOT NULL, period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS nexus_credit_usage_owner_period_idx
        ON nexus_credit_usage(owner_id, period_start, created_at DESC);
      CREATE TABLE IF NOT EXISTS portal_comments (
        id TEXT PRIMARY KEY, table_id TEXT NOT NULL, client_name TEXT NOT NULL,
        message TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$ BEGIN RETURN NEW; END $$;
    `);
    for (const table of ['automation_action_usage','enterprise_audit_logs','integration_webhooks','nexus_credit_usage','portal_comments']) {
      await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."${table}" TO anon, authenticated`);
      await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."${table}" TO PUBLIC`);
    }
    if (process.argv.includes('--after-migrations')) {
      for (const table of tables) {
        await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."${table}" TO service_role`);
      }
      await client.query('GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role');
    }
  } finally { await client.end(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
