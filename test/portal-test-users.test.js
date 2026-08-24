const assert = require("node:assert/strict");
const test = require("node:test");

test("portal acceptance seed defines deterministic users for every supported portal", async () => {
  const seed = await import("../scripts/seed-portal-acceptance.mjs");
  assert.deepEqual(seed.supportedPortalTestRoles, ["driver", "teacher", "parent", "doctor", "patient", "client"]);
  for (const role of seed.supportedPortalTestRoles) {
    const account = seed.portalTestAccounts[role];
    assert.ok(account?.email.endsWith("@smartmanage-demo.com"));
    assert.ok(account?.name);
  }
});

test("portal acceptance credentials are environment-only and seed remains demo-isolated", async () => {
  const source = require("node:fs").readFileSync(require.resolve("../scripts/seed-portal-acceptance.mjs"), "utf8");
  assert.match(source, /SMART_MANAGE_PORTAL_TEST_PASSWORD/);
  assert.match(source, /verifyDemoDatabaseTarget/);
  assert.match(source, /is_demo IS NOT TRUE/);
  assert.doesNotMatch(source, /password\s*[:=]\s*["'][^"']+["']/i);
});
