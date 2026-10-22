-- Security hotfix proposal: server-only tables must not be reachable through
-- the Supabase Data API roles. This migration is additive and intentionally
-- explicit; it does not grant or revoke access from the application backend
-- role and must be reviewed against the Production ledger before execution.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'password_reset_tokens',
    'email_verification_tokens',
    'authentication_audit_events',
    'professional_invitations',
    'invoices',
    'subscriptions',
    'platform_staff_roles',
    'board_member_access',
    'workspace_modules',
    'workspace_job_roles',
    'calendar_events',
    'demo_requests',
    'demo_request_events',
    'integration_webhooks',
    'portal_comments',
    'marketplace_templates',
    'marketplace_reviews',
    'marketplace_reports',
    'invoice_sequences',
    'file_audit_log',
    'background_job_audit',
    'enterprise_audit_logs',
    'enterprise_inquiries',
    'trip_status_history',
    'nexus_credit_usage',
    'automation_action_usage',
    'scheduler_locks',
    'portal_definitions',
    'workspace_portal_overrides'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
      END IF;
    END IF;
  END LOOP;
END $$;
