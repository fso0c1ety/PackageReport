const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const billing = readFileSync(join(root, "src", "app", "api", "_lib", "billing.js"), "utf8");
const overview = readFileSync(join(root, "src", "app", "api", "billing", "overview", "route.js"), "utf8");
const settings = readFileSync(join(root, "src", "app", "(dashboard)", "settings", "page.tsx"), "utf8");

test("seat usage uses canonical workspace memberships instead of legacy table shares", () => {
  assert.match(billing, /SELECT wm\.user_id\s+FROM workspace_members wm/);
  assert.doesNotMatch(billing, /jsonb_array_elements\(COALESCE\(t\.shared_users/);
});

test("active billing displays its Stripe period end and retains payment portal access", () => {
  assert.match(settings, /billingStatus\.plan === "trial" \? billingStatus\.trial_ends_at : billingStatus\.current_period_end/);
  assert.match(settings, />Manage payment method</);
  assert.match(overview, /subscriptions\?customer=\$\{encodeURIComponent\(customerId\)\}&status=active/);
  assert.match(overview, /\|\| subscriptions\?\.data\?\.\[0\]\?\.default_payment_method/);
});