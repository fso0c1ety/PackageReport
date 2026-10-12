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
  if (!(url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") || database !== "smart_manage_marketplace_test") {
    throw new Error("Marketplace integration is restricted to localhost smart_manage_marketplace_test");
  }
}

integrationTest("clean PostgreSQL install creates marketplace prerequisites before migration 013", async () => {
  assertLocalDatabase();
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: false });
  await client.connect();
  const existing = await client.query("SELECT to_regclass('public.schema_migrations') AS migrations");
  assert.equal(existing.rows[0].migrations, null, "integration database must start empty");
  await client.end();

  const { runMigrations } = require("../server/db/runMigrations");
  await runMigrations();

  const verify = new Client({ connectionString: process.env.DATABASE_URL, ssl: false });
  await verify.connect();
  const tables = await verify.query("SELECT to_regclass('public.marketplace_templates') AS templates, to_regclass('public.marketplace_reviews') AS reviews");
  const order = await verify.query("SELECT filename FROM schema_migrations WHERE filename IN ('012a_marketplace_base.sql','013_template_marketplace.sql') ORDER BY filename");
  await verify.end();
  assert.equal(tables.rows[0].templates, "marketplace_templates");
  assert.equal(tables.rows[0].reviews, "marketplace_reviews");
  assert.deepEqual(order.rows.map((row) => row.filename), ["012a_marketplace_base.sql", "013_template_marketplace.sql"]);
});
