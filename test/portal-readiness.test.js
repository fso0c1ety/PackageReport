const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("readiness manifest distinguishes supported, partial and shell portals", () => {
  const source = read("src/portal-engine/readiness.ts");
  for (const status of ["READY", "PARTIAL", "SHELL", "DISABLED"]) assert.match(source, new RegExp(`"${status}"`));
  for (const portal of ["driver", "teacher", "parent", "doctor", "patient", "client", "dispatcher", "fleet_manager", "receptionist", "sales", "project", "warehouse", "production", "hr_employee"]) assert.match(source, new RegExp(`"${portal}"`));
});

test("readiness gating preserves memberships and does not grant permissions", () => {
  const context = read("src/app/api/portal-context/route.js");
  const portal = read("src/app/api/professional-portal/route.js");
  assert.match(context, /portalReadiness/);
  assert.match(context, /resolvePortalConfig/);
  assert.match(portal, /PORTAL_NOT_READY/);
  assert.match(portal, /status: 409/);
  assert.doesNotMatch(portal, /UPDATE workspace_members/);
  assert.doesNotMatch(portal, /INSERT INTO workspace_members/);
});

test("direct shell portal navigation has a safe fallback", () => {
  const page = read("src/app/(dashboard)/portal/[portalType]/page.tsx");
  const sidebar = read("src/app/Sidebar.tsx");
  assert.match(page, /nuk është ende i disponueshëm/);
  assert.match(page, /href="\/home"/);
  assert.match(sidebar, /portalReadiness/);
  assert.match(sidebar, /Kthehu te Workspace/);
});

test("functional portal API exposes readiness without bypassing membership", () => {
  const route = read("src/app/api/professional-portal/route.js");
  assert.match(route, /selectPortalMembership\(memberships, \{ workspaceId, portalType \}\)/);
  assert.match(route, /isPortalOpenable\(readiness\)/);
  assert.match(route, /portalReadiness: readiness/);
});
