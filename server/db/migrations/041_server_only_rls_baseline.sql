-- Security baseline for tables that are accessed through the application server.
-- Browser clients use the application API and Realtime broadcast channels; they
-- do not require direct Data API CRUD access to these tables.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'password_reset_tokens',
    'email_verification_tokens',
    'account_activation_tokens',
    'auth_sessions',
    'authentication_audit_events',
    'invoices',
    'subscriptions',
    'marketplace_templates',
    'marketplace_reviews',
    'marketplace_reports',
    'calendar_events'
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

-- SECURITY DEFINER functions in public must not be callable by API roles unless
-- a separately reviewed policy explicitly grants them. Handle every overload.
DO $$
DECLARE
  routine record;
BEGIN
  FOR routine IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', routine.signature);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', routine.signature);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', routine.signature);
    END IF;
  END LOOP;
END $$;
