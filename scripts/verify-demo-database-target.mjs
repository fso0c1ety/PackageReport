import { createHash } from "node:crypto";
import pg from "pg";

export function normalizedDatabaseIdentity(connectionString) {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const url = new URL(connectionString);
  return { host: url.hostname.toLowerCase(), port: url.port || "5432", database: url.pathname.replace(/^\//, "") };
}

export function assertExpectedDatabaseTarget(identity, env = process.env) {
  const expectedHost = String(env.SMART_MANAGE_DEMO_DB_HOST || "").trim().toLowerCase();
  const expectedDatabase = String(env.SMART_MANAGE_DEMO_DB_NAME || "").trim();
  if (!expectedHost || !expectedDatabase) throw new Error("SMART_MANAGE_DEMO_DB_HOST and SMART_MANAGE_DEMO_DB_NAME are required for target verification");
  if (identity.host !== expectedHost || identity.database !== expectedDatabase) throw new Error("Database target does not match the explicitly approved Smart Manage database identity");
  if (/localhost|127\.0\.0\.1|\.local$/i.test(identity.host)) throw new Error("Refusing local/test database target for the production demo environment");
}

export async function verifyDemoDatabaseTarget({ connectionString = process.env.DATABASE_URL, env = process.env } = {}) {
  const identity = normalizedDatabaseIdentity(connectionString);
  assertExpectedDatabaseTarget(identity, env);
  const pool = new pg.Pool({ connectionString, ssl: env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false } });
  try {
    const result = await pool.query(`SELECT current_database() AS database, current_user AS db_user,
      (SELECT COUNT(*)::int FROM users) AS user_count,
      (SELECT COUNT(*)::int FROM workspaces) AS workspace_count,
      EXISTS(SELECT 1 FROM schema_migrations WHERE filename='027_demo_requests_and_demo_workspaces.sql') AS migration_027_applied`);
    const row = result.rows[0];
    if (row.database !== identity.database) throw new Error("Connected database identity differs from DATABASE_URL target");
    const fingerprint = createHash("sha256").update(`${identity.host}:${identity.port}/${row.database}:${row.db_user}`).digest("hex").slice(0, 16);
    let migration027Schema = null;
    if (row.migration_027_applied) {
      const schema = await pool.query(`SELECT
        to_regclass('public.demo_requests') IS NOT NULL AS demo_requests,
        to_regclass('public.platform_staff_roles') IS NOT NULL AS platform_staff_roles,
        (SELECT COUNT(*)=4 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' AND column_name=ANY(ARRAY['is_demo','demo_request_id','demo_expires_at','demo_metadata'])) AS workspace_columns,
        (SELECT COUNT(*)>=6 FROM pg_indexes WHERE schemaname='public' AND indexname=ANY(ARRAY['idx_demo_requests_status_created','idx_demo_requests_email','idx_demo_requests_assigned_to','idx_workspaces_demo_owner','idx_workspaces_demo_expiry','idx_platform_staff_active'])) AS indexes,
        (SELECT COUNT(*)=3 + CASE WHEN to_regclass('public.board_member_access') IS NULL THEN 0 ELSE 1 END
          FROM pg_trigger WHERE NOT tgisinternal AND tgname=ANY(ARRAY['trg_demo_workspace_owner','trg_demo_workspace_member','trg_demo_legacy_share','trg_demo_board_access'])) AS triggers`);
      migration027Schema = schema.rows[0];
      if (Object.values(migration027Schema).some((value) => value !== true)) throw new Error("Migration 027 is recorded but its required schema objects are incomplete");
    }
    return { host: identity.host, port: identity.port, database: row.database, dbUser: `${String(row.db_user).slice(0, 2)}***`, fingerprint, userCount: row.user_count, workspaceCount: row.workspace_count, migration027Applied: row.migration_027_applied, migration027Schema };
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).pathname.endsWith("/verify-demo-database-target.mjs")) {
  verifyDemoDatabaseTarget().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
