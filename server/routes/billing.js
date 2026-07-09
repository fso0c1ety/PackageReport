const express = require("express");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const authenticateToken = require("../middleware/authenticateToken");
const { sendEmail } = require("../mailer");
const billing = require("../services/billingService");
const { getEnvSource } = require("../config/env");

const router = express.Router();
const contactEmail = process.env.ENTERPRISE_CONTACT_EMAIL || "a.gjendzz@gmail.com";
const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
const stripeKeyPrefix = stripeSecretKey.startsWith("sk_live_")
  ? "sk_live"
  : stripeSecretKey.startsWith("sk_test_")
    ? "sk_test"
    : stripeSecretKey.slice(0, Math.min(7, stripeSecretKey.length)) || "missing";
const stripeKeyIsValid = /^(sk_test_|sk_live_)[A-Za-z0-9_]+$/.test(stripeSecretKey)
  && stripeSecretKey.length >= 20
  && !stripeSecretKey.includes("...")
  && !stripeSecretKey.includes("*");

console.info("[Billing] Stripe secret configuration", {
  source: getEnvSource("STRIPE_SECRET_KEY"),
  prefix: stripeKeyPrefix,
  length: stripeSecretKey.length,
  validFormat: stripeKeyIsValid,
});

if (!stripeKeyIsValid) {
  console.error("[Billing] STRIPE_SECRET_KEY is missing or invalid. Expected a complete sk_test_ or sk_live_ server key.");
}

function requireStripeConfiguration(res) {
  if (stripeKeyIsValid) return true;
  res.status(503).json({ error: "Billing is not configured" });
  return false;
}

async function stripeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${stripeSecretKey}`,
      },
    });
    if (response.status === 401) {
      console.error("[Billing] Stripe rejected STRIPE_SECRET_KEY", {
        prefix: stripeKeyPrefix,
        length: stripeSecretKey.length,
      });
    }
    return response;
  } catch (error) {
    console.error("[Billing] Stripe request failed", { message: error.message });
    return null;
  }
}

router.get("/billing/status", authenticateToken, async (req, res) => {
  try {
    res.json(await billing.getStatus(req.user.id));
  } catch {
    res.status(500).json({ error: "Unable to load billing status" });
  }
});

router.post("/billing/checkout", authenticateToken, async (req, res) => {
  const plan = String(req.body?.plan || "");
  const billingCycle = req.body?.billing === "yearly" ? "yearly" : "monthly";
  const config = billing.PLANS[plan];
  if (!config || plan === "trial") return res.status(400).json({ error: "Invalid paid plan" });
  if (!requireStripeConfiguration(res)) return;
  const checkoutPrice = billing.getPlanCheckoutPrice(plan, billingCycle);

  const frontend = String(process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  const params = new URLSearchParams({
    mode: "subscription",
    "payment_method_types[0]": "card",
    success_url: `${frontend}/pricing/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontend}/pricing/?checkout=canceled`,
    customer_email: req.user.email,
    "metadata[user_id]": req.user.id,
    "metadata[plan]": plan,
    "metadata[billing]": billingCycle,
    "subscription_data[metadata][user_id]": req.user.id,
    "subscription_data[metadata][plan]": plan,
    "subscription_data[metadata][billing]": billingCycle,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(checkoutPrice.amountCents),
    "line_items[0][price_data][recurring][interval]": checkoutPrice.interval,
    "line_items[0][price_data][product_data][name]": `Smart Manage ${plan}`,
  });
  const response = await stripeRequest("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!response) return res.status(503).json({ error: "Billing is temporarily unavailable" });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) return res.status(503).json({ error: "Billing is not configured" });
    return res.status(502).json({ error: data?.error?.message || "Checkout creation failed" });
  }
  res.json({ url: data.url });
});

router.post("/billing/confirm", authenticateToken, async (req, res) => {
  if (!requireStripeConfiguration(res)) return;
  const sessionId = encodeURIComponent(String(req.body?.sessionId || ""));
  const response = await stripeRequest(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`);
  if (!response) return res.status(503).json({ error: "Billing is temporarily unavailable" });
  const session = await response.json();
  if (response.status === 401) return res.status(503).json({ error: "Billing is not configured" });
  if (!response.ok || session.metadata?.user_id !== req.user.id || session.payment_status !== "paid") {
    return res.status(400).json({ error: "Payment is not confirmed" });
  }
  let currentPeriodEnd = null;
  if (session.subscription) {
    const subscriptionResponse = await stripeRequest(
      `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(session.subscription)}`
    );
    if (subscriptionResponse?.ok) {
      const stripeSubscription = await subscriptionResponse.json();
      if (stripeSubscription.current_period_end) {
        currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      }
    }
  }
  res.json(await billing.activatePlan(req.user.id, session.metadata.plan, {
    customerId: session.customer,
    subscriptionId: session.subscription,
    currentPeriodEnd,
  }));
});

router.post("/billing/enterprise-inquiry", authenticateToken, async (req, res) => {
  const seats = Number(req.body?.seats);
  if (!Number.isInteger(seats) || seats <= 20) return res.status(400).json({ error: "Enterprise requires more than 20 seats" });
  const profile = await db.query("SELECT name,email,company FROM users WHERE id=$1", [req.user.id]);
  const user = profile.rows[0];
  await db.query(
    `INSERT INTO enterprise_inquiries (id,user_id,name,email,company,requested_seats,message)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [uuidv4(), req.user.id, user.name, user.email, req.body.company || user.company || "", seats, String(req.body.message || "").slice(0, 2000)]
  );
  await sendEmail({
    to: contactEmail,
    subject: `Enterprise request: ${seats} seats`,
    text: `${user.name} (${user.email}) requests ${seats} seats.\nCompany: ${req.body.company || user.company || "-"}\n${req.body.message || ""}`,
  }).catch(() => {});
  res.json({ success: true, message: "Enterprise request sent" });
});

module.exports = router;
