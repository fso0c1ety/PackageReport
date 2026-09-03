const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const webhook = readFileSync(
  join(process.cwd(), "src", "app", "api", "billing", "webhook", "route.js"),
  "utf8",
);

test("Stripe webhook resolves accounts by Stripe identity and preserves the paid period", () => {
  assert.match(webhook, /stripe_subscription_id=\$1/);
  assert.match(webhook, /stripe_customer_id=\$2/);
  assert.match(webhook, /Stripe billing identity does not match/);
  assert.match(webhook, /const plan = object\.metadata\?\.plan \|\| account\.plan/);
  assert.match(webhook, /invoiceCurrentPeriodEnd\(object\)/);
  assert.match(webhook, /setSubscriptionStatus\(subscriptionId, "active", currentPeriodEnd\)/);
});

test("paid webhook remains on the canonical billing activation path", () => {
  assert.match(webhook, /await activateBillingPlan\(userId, plan, \{/);
  assert.doesNotMatch(webhook, /INSERT INTO subscriptions/);
  assert.doesNotMatch(webhook, /unlimited|manual entitlement/i);
});