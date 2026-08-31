const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { INTERNAL_OWNER_EMAILS, isInternalOwnerEmail } = require("../server/services/internalOwnerEntitlement");

test("only approved Smart Manage internal owner accounts receive owner entitlement", () => {
  assert.deepEqual(INTERNAL_OWNER_EMAILS, [
    "a.gjendzz@gmail.com",
    "valitv7@gmail.com",
    "bleonahalili8@gmail.com",
  ]);
  assert.equal(isInternalOwnerEmail("A.GJENDZZ@GMAIL.COM"), true);
  assert.equal(isInternalOwnerEmail("customer@example.com"), false);
  assert.equal(isInternalOwnerEmail("a.gjendzz@gmail.com.evil.example"), false);
});

test("UI and both billing runtimes derive Internal Unlimited only from internal_owner", () => {
  const root = process.cwd();
  const sidebar = readFileSync(join(root, "src", "app", "Sidebar.tsx"), "utf8");
  const nextBilling = readFileSync(join(root, "src", "app", "api", "_lib", "billing.js"), "utf8");
  const serverBilling = readFileSync(join(root, "server", "services", "billingService.js"), "utf8");
  assert.match(sidebar, /billingStatus\.internal_owner\) return "Internal · Unlimited"/);
  assert.doesNotMatch(sidebar, /billingStatus\.unlimited\) return "Internal · Unlimited"/);
  for (const source of [nextBilling, serverBilling]) {
    assert.doesNotMatch(source, /demoOnlyOwner/);
    assert.match(source, /const unlimited = internalOwner/);
  }
});
