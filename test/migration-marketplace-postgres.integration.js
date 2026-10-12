const test = require("node:test");
const assert = require("node:assert/strict");
const { Client } = require("pg");

const enabled = process.env.SMART_MANAGE_MARKETPLACE_INTEGRATION === "1";
const integrationTest = enabled ? test : test.skip;

function assertLocalDatabase() {
  const raw = process.env.DATABASE_URL || "";
  if (!raw) throw new Error("SMART_MANAGE_MARKETPLACE_INTEGRATION requires DATABASE_URL");
  const url = new URL(raw);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!(url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") || database !== "smart_manage_migration_test") {
    throw new Error("Marketplace integration is restricted to localhost smart_manage_migration_test");
  }
}

integrationTest("clean PostgreSQL install creates marketplace prerequisites before migration 013", async () => {
  assertLocalDatabase();
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: false });
  await client.connect();
  assert.ok(!process.env.MIGRATION_TARGET);
  const phase = process.env.MIGRATION_TEST_PHASE;
  assert.ok(['empty', 'migrated'].includes(phase), 'explicit phase required');
  const version = await client.query('SHOW server_version_num');
  assert.equal(Math.floor(Number(version.rows[0].server_version_num) / 10000), 16);
  if (phase === 'empty') {
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    await client.end();
    assert.equal(tables.rowCount, 0, 'database must start completely empty');
    return;
  }
  const before = await client.query('SELECT * FROM schema_migrations ORDER BY filename');
  await client.query("INSERT INTO users(id,name,email) VALUES('migration-sentinel','Migration Test','migration-sentinel@example.test')");
  await client.query("INSERT INTO marketplace_templates(id,name,author_id) VALUES('migration-sentinel-template','Preserve me','migration-sentinel')");
  const dataBefore = await client.query("SELECT * FROM marketplace_templates WHERE id='migration-sentinel-template'");
  await client.end();

  require('node:child_process').execFileSync(process.execPath, ['server/db/runMigrations.js'], { stdio: 'inherit', env: process.env });

  const verify = new Client({ connectionString: process.env.DATABASE_URL, ssl: false });
  await verify.connect();
  const tables = await verify.query("SELECT to_regclass('public.marketplace_templates') AS templates, to_regclass('public.marketplace_reviews') AS reviews");
  const order = await verify.query("SELECT filename FROM schema_migrations WHERE filename IN ('012a_marketplace_base.sql','013_template_marketplace.sql') ORDER BY filename");
  const after = await verify.query('SELECT * FROM schema_migrations ORDER BY filename');
  const dataAfter = await verify.query("SELECT * FROM marketplace_templates WHERE id='migration-sentinel-template'");
  assert.deepEqual(after.rows, before.rows);
  assert.deepEqual(dataAfter.rows, dataBefore.rows);
  await verify.end();
  assert.equal(tables.rows[0].templates, "marketplace_templates");
  assert.equal(tables.rows[0].reviews, "marketplace_reviews");
  assert.deepEqual(order.rows.map((row) => row.filename), ["012a_marketplace_base.sql", "013_template_marketplace.sql"]);
});
