const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const Stripe = require("stripe");

const webhook = readFileSync(
  join(process.cwd(), "src", "app", "api", "billing", "webhook", "route.js"),
  "utf8",
);

const webhookSecret = "whsec_regression_secret";
const payload = JSON.stringify({
  id: "evt_regression",
  object: "event",
  type: "checkout.session.completed",
});
const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });

test("Stripe SDK accepts valid signatures and rejects invalid signatures", () => {
  const stripe = new Stripe("sk_test_regression");

  assert.doesNotThrow(() => stripe.webhooks.constructEvent(payload, signature, webhookSecret));
  assert.throws(
    () => stripe.webhooks.constructEvent(payload, signature, "whsec_wrong_secret"),
    /No signatures found matching the expected signature for payload/,
  );
});

test("Stripe webhook resolves accounts by Stripe identity and preserves the paid period", () => {
  assert.match(webhook, /stripe_subscription_id=\$1/);
  assert.match(webhook, /stripe_customer_id=\$2/);
  assert.match(webhook, /Stripe billing identity does not match/);
  assert.match(webhook, /const plan = object\.metadata\?\.plan \|\| account\.plan/);
  assert.match(webhook, /invoiceCurrentPeriodEnd\(object\)/);
  assert.match(webhook, /setSubscriptionStatus\(subscriptionId, "active", currentPeriodEnd\)/);
});

test("paid webhook remains on the canonical billing activation path", () => {
  assert.match(webhook, /stripe\.webhooks\.constructEvent\(/);
  assert.match(webhook, /const payload = await req\.text\(\)/);
  assert.match(webhook, /return NextResponse\.json\(\{ error: "Invalid signature" \}, \{ status: 400 \}\)/);
  assert.match(webhook, /await activateBillingPlan\(userId, plan, \{/);
  assert.match(webhook, /event\.type === "checkout\.session\.completed"/);
  assert.match(webhook, /event\.type === "invoice\.paid"/);
  assert.match(webhook, /notificationExists\(event\.id\)/);
  assert.doesNotMatch(webhook, /INSERT INTO subscriptions/);
  assert.doesNotMatch(webhook, /createHmac|timingSafeEqual|verifyStripeSignature/);
  assert.doesNotMatch(webhook, /unlimited|manual entitlement/i);
});

test("temporary secret fingerprint diagnostic is internal and non-sensitive", () => {
  const diagnostic = readFileSync(
    join(process.cwd(), "src", "app", "api", "internal", "diagnostics", "webhook-secret-fingerprint", "route.js"),
    "utf8",
  );
  assert.match(diagnostic, /requirePlatformPermission\(req, "demo_requests\.read"\)/);
  assert.match(diagnostic, /createHash\("sha256"\)/);
  assert.match(diagnostic, /digest\("hex"\)\.slice\(0, 12\)/);
  assert.doesNotMatch(diagnostic, /length|prefix|suffix|stripe-signature|rawBody/i);
});