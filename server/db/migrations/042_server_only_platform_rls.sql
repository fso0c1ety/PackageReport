-- Security baseline for the remaining tables used through server/API routes.
-- No browser Data API CRUD is required for these tables; service_role/backend
-- access is preserved while anon/authenticated access is removed.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'automation_action_usage',
    'background_job_audit',
    'board_member_access',
    'demo_request_events',
    'demo_requests',
    'enterprise_audit_logs',
    'enterprise_inquiries',
    'file_audit_log',
    'integration_webhooks',
    'invoice_sequences',
    'nexus_credit_usage',
    'platform_staff_roles',
    'portal_comments',
    'portal_definitions',
    'professional_invitations',
    'scheduler_locks',
    'trip_status_history',
    'workspace_job_roles',
    'workspace_modules',
    'workspace_portal_overrides'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
      END IF;
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    END IF;
  END LOOP;
END $$;
