const test = require("node:test");
const assert = require("node:assert/strict");
const { Client } = require("pg");
const { checksum } = require("../server/db/migrationUtils");
const { executionSql } = require("../server/db/migrationExecution");

const migration = require("node:fs").readFileSync("server/db/migrations/002_backfill_empty_workspaces.sql", "utf8");
const historicalChecksum = checksum(migration);

async function freshDatabase() {
  const admin = new Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  await admin.query("DROP SCHEMA public CASCADE");
  await admin.query("CREATE SCHEMA public");
  await admin.end();
}

test("PostgreSQL 16 fresh bootstrap executes migration 002 as TIMESTAMPTZ", async () => {
  await freshDatabase();
  process.env.MIGRATION_TARGET = "000_legacy_base_schema.sql";
  const { runMigrations } = require("../server/db/runMigrations");
  await runMigrations();
  const seed = new Client({ connectionString: process.env.DATABASE_URL });
  await seed.connect();
  await seed.query("INSERT INTO users(id,name,email) VALUES('migration-user','Migration User','migration@example.test')");
  await seed.query("INSERT INTO workspaces(id,name,owner_id) VALUES('migration-workspace','Migration Workspace','migration-user')");
  await seed.end();

  process.env.MIGRATION_TARGET = "001_core_saas_schema.sql,002_backfill_empty_workspaces.sql";
  await runMigrations();
  const verify = new Client({ connectionString: process.env.DATABASE_URL });
  await verify.connect();
  const column = await verify.query("SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='tables' AND column_name='created_at'");
  const table = await verify.query("SELECT id,created_at FROM tables WHERE workspace_id='migration-workspace'");
  const stored = await verify.query("SELECT checksum FROM schema_migrations WHERE filename='002_backfill_empty_workspaces.sql'");
  await verify.end();
  assert.equal(column.rows[0].data_type, "timestamp with time zone");
  assert.equal(table.rows.length, 1);
  assert.ok(table.rows[0].created_at instanceof Date);
  assert.equal(stored.rows[0].checksum, historicalChecksum);
});

test("PostgreSQL 16 rerun accepts historical checksum and leaves rows unchanged", async () => {
  const { runMigrations } = require("../server/db/runMigrations");
  const beforeClient = new Client({ connectionString: process.env.DATABASE_URL });
  await beforeClient.connect();
  const before = await beforeClient.query("SELECT id,created_at FROM tables WHERE workspace_id='migration-workspace'");
  const appliedBefore = await beforeClient.query("SELECT checksum FROM schema_migrations WHERE filename='002_backfill_empty_workspaces.sql'");
  await beforeClient.end();
  await runMigrations();
  const afterClient = new Client({ connectionString: process.env.DATABASE_URL });
  await afterClient.connect();
  const after = await afterClient.query("SELECT id,created_at FROM tables WHERE workspace_id='migration-workspace'");
  const appliedAfter = await afterClient.query("SELECT checksum FROM schema_migrations WHERE filename='002_backfill_empty_workspaces.sql'");
  await afterClient.end();
  assert.deepEqual(after.rows, before.rows);
  assert.deepEqual(appliedAfter.rows, appliedBefore.rows);
});

test("executionSql only transforms the exact known migration expression", () => {
  assert.match(executionSql("002_backfill_empty_workspaces.sql", migration), /NOW\(\),/);
  assert.throws(() => executionSql("002_backfill_empty_workspaces.sql", "SELECT 1"), /did not match exactly once/);
  assert.equal(executionSql("001_core_saas_schema.sql", "SELECT 1"), "SELECT 1");
});
