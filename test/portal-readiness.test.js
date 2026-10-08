const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

async function responseParser() {
  return import("../src/app/portalContextResponse.js");
}

test("portal context parser fails closed for null, invalid JSON and wrong membership", async () => {
  const { parsePortalContextResponse } = await responseParser();
  assert.match(parsePortalContextResponse(null, "teacher").error, /e pavlefshme/);
  assert.match(parsePortalContextResponse({ active: null }, "teacher").error, /konteksti/);
  assert.match(parsePortalContextResponse({ active: { portalType: "parent" } }, "teacher").error, /nuk është i caktuar/);
});

test("portal context parser accepts READY and PARTIAL active memberships", async () => {
  const { parsePortalContextResponse } = await responseParser();
  const teacher = { active: { portalType: "teacher", portalReadiness: { status: "READY" } } };
  const driver = { active: { portalType: "driver", portalReadiness: { status: "PARTIAL" } } };
  assert.equal(parsePortalContextResponse(teacher, "teacher").membership, teacher.active);
  assert.equal(parsePortalContextResponse(driver, "driver").membership, driver.active);
});

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
  const layout = read("src/app/ClientLayout.tsx");
  assert.match(page, /parsePortalContextResponse\(data, requested\)/);
  assert.match(page, /nuk është ende i disponueshëm/);
  assert.match(page, /href="\/home"/);
  assert.match(page, /Provo përsëri/);
  assert.match(sidebar, /portalReadiness/);
  assert.match(sidebar, /Kthehu te Workspace/);
  assert.match(layout, /readinessStatus === "SHELL"/);
  assert.match(layout, /replace\(\/\\\.html\$\/i, ""\)/);
});

test("functional portal API exposes readiness without bypassing membership", () => {
  const route = read("src/app/api/professional-portal/route.js");
  assert.match(route, /selectPortalMembership\(memberships, \{ workspaceId, portalType \}\)/);
  assert.match(route, /isPortalOpenable\(readiness\)/);
  assert.match(route, /portalReadiness: readiness/);
  assert.match(route, /access\.readiness/);
  assert.match(route, /PORTAL_NOT_READY/);
});

test("ready and partial portals read readiness from active membership", () => {
  const page = read("src/app/(dashboard)/portal/[portalType]/page.tsx");
  assert.match(page, /parsePortalContextResponse\(data, requested\)/);
  assert.match(page, /setContext\(membership\)/);
  assert.match(read("src/portal-engine/readiness.ts"), /portalType: "teacher", status: "READY"/);
  assert.match(read("src/portal-engine/readiness.ts"), /portalType: "driver", status: "PARTIAL"/);
});

test("readiness gating does not add polling, realtime subscriptions or portal-context call sites", () => {
  const diffFiles = [
    "src/app/(dashboard)/portal/[portalType]/page.tsx",
    "src/app/ClientLayout.tsx",
    "src/app/MobileBottomNavigation.tsx",
  ];
  for (const file of diffFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /setInterval\(/, `${file} must not add polling`);
    assert.doesNotMatch(source, /supabase\.channel\(/, `${file} must not add realtime subscriptions`);
  }
  const page = read("src/app/(dashboard)/portal/[portalType]/page.tsx");
  assert.equal((page.match(/portal-context/g) || []).length, 1);
  assert.match(page, /authenticatedFetch/);
});
