const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const read = (...parts) => readFileSync(join(process.cwd(), ...parts), "utf8");

test("Phase 3B separates workspace, board, profession, portal and record scope", () => {
  const model = read("src", "app", "api", "_lib", "universalRoles.js");
  assert.match(model, /WORKSPACE_ROLES = \["owner", "admin", "manager", "member", "guest"\]/);
  assert.match(model, /BOARD_ROLES = \["owner", "editor", "commenter", "viewer"\]/);
  assert.match(model, /JOB_ROLE_DEFAULTS/);
  assert.match(model, /RECORD_ACCESS_SCOPES/);
  assert.match(model, /PORTAL_ROUTES/);
});

test("member access updates normalized and legacy storage atomically", () => {
  const route = read("src", "app", "api", "workspaces", "[workspaceId]", "members", "[userId]", "route.js");
  assert.match(route, /INSERT INTO workspace_members/);
  assert.match(route, /INSERT INTO board_member_access/);
  assert.match(route, /UPDATE tables SET shared_users/);
  assert.match(route, /BEGIN/);
  assert.match(route, /COMMIT/);
});

test("portal routing is resolved from server membership and keeps driver compatibility", () => {
  const context = read("src", "app", "api", "portal-context", "route.js");
  const layout = read("src", "app", "ClientLayout.tsx");
  assert.match(context, /listUserMemberships/);
  assert.match(layout, /portal-context/);
  assert.match(layout, /portalType === "driver"/);
  assert.match(layout, /driver-trips/);
});

test("row lists and cross-feature search enforce database-side record visibility", () => {
  const tasks = read("src", "app", "api", "tables", "[tableId]", "tasks", "route.js");
  const search = read("src", "app", "api", "search", "route.js");
  const myWork = read("src", "app", "api", "my-work", "route.js");
  for (const source of [tasks, search, myWork]) assert.match(source, /smart_manage_row_visible/);
});

test("invite UI and API submit the four independent access dimensions", () => {
  const settings = read("src", "app", "(dashboard)", "settings", "page.tsx");
  const invite = read("src", "app", "api", "tables", "[tableId]", "invite", "route.js");
  for (const field of ["workspaceRole", "jobRoles", "portalType", "recordAccess", "boardRole"]) {
    assert.match(settings, new RegExp(field));
    assert.match(invite, new RegExp(field));
  }
});

test("invite acceptance preserves portal metadata on legacy databases", () => {
  const accept = read("src", "app", "api", "notifications", "[id]", "accept", "route.js");
  assert.match(accept, /hasUniversalMembership/);
  assert.match(accept, /hasBoardMemberAccess/);
  assert.match(accept, /portalType, landingRoute: PORTAL_ROUTES\[portalType\], recordAccess/);
  assert.match(accept, /INSERT INTO workspace_members\(workspace_id,user_id,role,updated_at\)/);
});

test("team listing supports legacy membership columns and portal metadata", () => {
  const teammates = read("src", "app", "api", "teammates", "route.js");
  assert.match(teammates, /membershipProjection/);
  assert.match(teammates, /has_portal_type/);
  assert.match(teammates, /elem->>'portalType'/);
  assert.match(teammates, /elem->'recordAccess'/);
});
