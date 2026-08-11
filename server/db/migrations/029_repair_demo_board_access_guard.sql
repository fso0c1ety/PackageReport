-- Migration 027 may run before the optional board_member_access table exists.
-- Reinstall its demo isolation guard after the portal engine migrations.
DO $$
BEGIN
  IF to_regclass('public.board_member_access') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_demo_board_access ON board_member_access;
    CREATE TRIGGER trg_demo_board_access
      BEFORE INSERT OR UPDATE OF table_id, user_id ON board_member_access
      FOR EACH ROW EXECUTE FUNCTION smart_manage_enforce_demo_board_access();
  END IF;
END $$;
