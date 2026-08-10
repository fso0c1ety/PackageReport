const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const read = (...parts) => readFileSync(join(process.cwd(), ...parts), "utf8");

test("shared portal engine defines configuration, registry and shell", () => {
  assert.match(read("src", "portal-engine", "types.ts"), /type PortalConfig/);
  assert.match(read("src", "portal-engine", "registry.ts"), /resolvePortalConfig/);
  assert.match(read("src", "app", "components", "portal", "PortalShell.tsx"), /config\?\.navigation/);
});

test("driver is the first preserved config-driven portal", () => {
  const driver = read("src", "portal-engine", "configs", "driver.ts");
  assert.match(driver, /portalType: "driver"/);
  assert.match(driver, /assignedDriverUserId/);
  assert.match(driver, /customerPrice.*carrierPrice.*margin.*internalNotes/);
});

test("workspace legacy shared users are normalized safely", () => {
  const migration = read("server", "db", "migrations", "026_portal_engine_and_legacy_access.sql");
  assert.match(migration, /jsonb_typeof\(shared_users\) = 'object'/);
  assert.match(migration, /jsonb_build_array\(shared_users\)/);
  const route = read("server", "routes", "workspaces.js");
  assert.doesNotMatch(route, /jsonb_array_elements\(shared_users\)/);
  assert.doesNotMatch(route, /jsonb_array_elements\(t\.shared_users\)/);
  const nextRoute = read("src", "app", "api", "workspaces", "[workspaceId]", "tables", "route.js");
  assert.doesNotMatch(nextRoute, /JOIN board_member_access/);
  assert.match(nextRoute, /COALESCE\(wm\.role,''\)/);
  assert.match(nextRoute, /logistics_admin/);
});

test("portal context returns the resolved configuration", () => {
  const route = read("src", "app", "api", "portal-context", "route.js");
  assert.match(route, /resolvePortalConfig/);
  assert.match(route, /portalConfig/);
});

test("board authorization safely supports databases before the universal-role migration", () => {
  const source = read("src", "app", "api", "_lib", "authorization.js");
  assert.match(source, /hasUniversalRoleSchema/);
  assert.match(source, /to_regclass\('public\.board_member_access'\)/);
  assert.match(source, /if \(!\(await hasUniversalRoleSchema\(pool\)\)\)/);
  assert.match(source, /jsonb_array_elements\(CASE WHEN jsonb_typeof/);
  assert.doesNotMatch(source, /wm\.user_id IS NOT NULL AS access_role/);
});
