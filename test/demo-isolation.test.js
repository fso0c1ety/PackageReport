const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const migrationPath = join(root, "server", "db", "migrations", "027_demo_requests_and_demo_workspaces.sql");
const seedPath = join(root, "scripts", "seed-marketing-demo.mjs");
const targetVerifierPath = join(root, "scripts", "verify-demo-database-target.mjs");

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
  assert.match(sql, /to_regclass\('public\.board_member_access'\)/);
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

test("demo database target verification fails closed and never logs credentials", async () => {
  const verifier = await import("../scripts/verify-demo-database-target.mjs");
  const identity = verifier.normalizedDatabaseIdentity("postgresql://secret-user:secret-password@db.smartmanage.example:5432/smart_manage");
  assert.deepEqual(identity, { host: "db.smartmanage.example", port: "5432", database: "smart_manage" });
  assert.throws(() => verifier.assertExpectedDatabaseTarget(identity, {}), /required for target verification/);
  assert.throws(() => verifier.assertExpectedDatabaseTarget(identity, { SMART_MANAGE_DEMO_DB_HOST: "other.example", SMART_MANAGE_DEMO_DB_NAME: "smart_manage" }), /does not match/);
  assert.doesNotThrow(() => verifier.assertExpectedDatabaseTarget(identity, { SMART_MANAGE_DEMO_DB_HOST: "db.smartmanage.example", SMART_MANAGE_DEMO_DB_NAME: "smart_manage" }));
  assert.doesNotMatch(readFileSync(targetVerifierPath, "utf8"), /console\.log\([^\n]*(connectionString|DATABASE_URL)/);
});

test("Phase B seeder includes all priority datasets and a fleet portal dataset", () => {
  const source = readFileSync(seedPath, "utf8");
  for (const key of ["project_management", "freight_broker", "crm_sales", "kindergarten_nursery", "dental_clinic", "construction", "fleet_management"]) assert.match(source, new RegExp(`templateKey: \\"${key}\\"`));
  assert.match(source, /broken relations detected/);
  assert.match(source, /Driver Portal has no assigned trip/);
  assert.match(source, /_assignedDriverUserId/);
  assert.match(source, /information_schema\.columns/);
  assert.match(source, /hasUniversalMembership/);
});

test("marketing demo-only owners receive a screenshot-safe internal entitlement", () => {
  const billing = readFileSync(join(root, "src", "app", "api", "_lib", "billing.js"), "utf8");
  assert.match(billing, /demoOnlyOwner/);
  assert.match(billing, /COUNT\(\*\) FILTER \(WHERE COALESCE\(is_demo, false\)\)/);
  assert.doesNotMatch(billing, /demo@smartmanage\.com/);
});
