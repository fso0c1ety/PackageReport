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
  const afterMigrations = process.argv.includes('--after-migrations');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    if (!afterMigrations) await client.query(`
      DO $$ DECLARE role_name text;
      BEGIN
        FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name)
            THEN EXECUTE format('CREATE ROLE %I NOLOGIN', role_name);
          END IF;
        END LOOP;
      END $$;
      ALTER ROLE service_role BYPASSRLS;
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$ BEGIN RETURN NEW; END $$;
    `);
    if (!afterMigrations) {
    } else {
      for (const table of tables) {
        await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."${table}" TO service_role`);
      }
      await client.query('GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role');
    }
  } finally { await client.end(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
