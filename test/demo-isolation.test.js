const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const migrationPath = join(root, "server", "db", "migrations", "027_demo_requests_and_demo_workspaces.sql");
const seedPath = join(root, "scripts", "seed-marketing-demo.mjs");

test("demo migration is additive and defines isolated workspace metadata", () => {
  const sql = readFileSync(migrationPath, "utf8");
  for (const field of ["is_demo", "demo_request_id", "demo_expires_at", "demo_metadata"]) assert.match(sql, new RegExp(field));
  assert.match(sql, /CREATE TABLE IF NOT EXISTS demo_requests/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS platform_staff_roles/);
  assert.match(sql, /platform_admin.*demo_manager.*demo_sales/);
});

test("database triggers prevent demo account access to non-demo resources", () => {
  const sql = readFileSync(migrationPath, "utf8");
  assert.match(sql, /smart_manage_enforce_demo_workspace_owner/);
  assert.match(sql, /smart_manage_enforce_demo_workspace_member/);
  assert.match(sql, /smart_manage_enforce_demo_legacy_share/);
  assert.match(sql, /smart_manage_enforce_demo_board_access/);
  assert.match(sql, /LOWER\(email\)='demo@smartmanage\.com'/);
  assert.match(sql, /is_demo=TRUE/);
});

test("marketing demo seeder uses environment credentials and the template catalog", () => {
  const source = readFileSync(seedPath, "utf8");
  assert.match(source, /process\.env\.SMART_MANAGE_DEMO_PASSWORD/);
  assert.match(source, /getWorkspaceTemplateManifest/);
  assert.match(source, /\.\.\/src\/workspaceTemplates\.ts/);
  assert.doesNotMatch(source, /SMART_MANAGE_DEMO_PASSWORD\s*=\s*["'][^"']+["']/);
  assert.match(source, /Refusing to seed a workspace that is not explicitly marked as demo/);
  assert.match(source, /Demo account isolation violation/);
});

test("demo password and workspace guards fail closed", async () => {
  const demoSeeder = await import("../scripts/seed-marketing-demo.mjs");
  assert.throws(() => demoSeeder.assertDemoPassword("weak"), /at least 12 characters/);
  assert.doesNotThrow(() => demoSeeder.assertDemoPassword("StrongDemo123"));
  assert.throws(() => demoSeeder.assertWorkspaceMayBeSeeded({ is_demo: false }), /Refusing to seed/);
  assert.throws(() => demoSeeder.assertWorkspaceMayBeSeeded(null), /Refusing to seed/);
  assert.doesNotThrow(() => demoSeeder.assertWorkspaceMayBeSeeded({ is_demo: true }));
});

test("production deploy includes migration 027", () => {
  const build = readFileSync(join(root, "scripts", "vercel-build.js"), "utf8");
  assert.match(build, /027_demo_requests_and_demo_workspaces\.sql/);
});
