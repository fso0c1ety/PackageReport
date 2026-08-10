const test = require("node:test");
const assert = require("node:assert/strict");

test("platform demo permissions are independent from workspace roles", async () => {
  const { hasPlatformPermission } = await import("../server/services/platformPermissions.js");
  assert.equal(hasPlatformPermission({ active: true, role: "platform_admin", permissions: [] }, "demo_workspaces.create"), true);
  assert.equal(hasPlatformPermission({ active: true, role: "demo_manager", permissions: [] }, "demo_access.send"), true);
  assert.equal(hasPlatformPermission({ active: true, role: "demo_sales", permissions: [] }, "demo_requests.read"), true);
  assert.equal(hasPlatformPermission({ active: true, role: "demo_sales", permissions: [] }, "demo_workspaces.create"), false);
  assert.equal(hasPlatformPermission({ active: true, role: "admin", permissions: ["manage_workspace"] }, "demo_requests.read"), false);
  assert.equal(hasPlatformPermission({ active: false, role: "platform_admin", permissions: [] }, "demo_requests.read"), false);
});
