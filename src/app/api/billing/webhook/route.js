import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { pool } from "../../_lib/server";
import { activateBillingPlan } from "../../_lib/billing";
import { sendEmail } from "../../_lib/mailer";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

function subscriptionIdFromInvoice(invoice) {
  return invoice.subscription
    || invoice.parent?.subscription_details?.subscription
    || null;
}

function invoiceSubscriptionMetadata(invoice) {
  return invoice.parent?.subscription_details?.metadata
    || invoice.subscription_details?.metadata
    || {};
}

function invoiceCurrentPeriodEnd(invoice) {
  const periodEnd = invoice.period_end || invoice.lines?.data?.[0]?.period?.end;
  return periodEnd ? new Date(periodEnd * 1000) : null;
}

async function resolveWebhookAccount({ userId, customerId, subscriptionId }) {
  const result = await pool.query(
    `SELECT user_id, plan
     FROM subscriptions
     WHERE ($1::text IS NOT NULL AND stripe_subscription_id=$1)
        OR ($2::text IS NOT NULL AND stripe_customer_id=$2)
     LIMIT 1`,
    [subscriptionId || null, customerId || null]
  );
  const linked = result.rows[0];
  if (linked?.user_id && userId && String(linked.user_id) !== String(userId)) {
    throw new Error("Stripe billing identity does not match the account metadata");
  }
  return {
    userId: userId || linked?.user_id || null,
    plan: linked?.plan || null,
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function setSubscriptionStatus(subscriptionId, status, currentPeriodEnd = null) {
  if (!subscriptionId) return;
  await pool.query(
    `UPDATE subscriptions
     SET status=$1,
         current_period_end=COALESCE($2, current_period_end),
         updated_at=NOW()
     WHERE stripe_subscription_id=$3`,
    [status, currentPeriodEnd, subscriptionId]
  );
}

async function notificationExists(stripeEventId) {
  const result = await pool.query(
    `SELECT 1 FROM notifications
     WHERE data->>'stripeEventId'=$1
     LIMIT 1`,
    [stripeEventId]
  );
  return result.rowCount > 0;
}

async function notifyUser(userId, event, title, message, emailSubject, links = {}) {
  if (!userId || await notificationExists(event.id)) return;

  await pool.query(
    `INSERT INTO notifications (id, recipient_id, type, data, read, created_at)
     VALUES ($1, $2, 'billing', $3::jsonb, false, NOW())`,
    [randomUUID(), userId, JSON.stringify({
      stripeEventId: event.id,
      title,
      message,
      billing: true,
      invoiceUrl: links.invoiceUrl || null,
      invoicePdf: links.invoicePdf || null,
    })]
  );

  const userResult = await pool.query(
    "SELECT email, name FROM users WHERE id=$1 LIMIT 1",
    [userId]
  );
  const user = userResult.rows[0];
  if (!user?.email) return;

  const invoiceText = [
    links.invoiceUrl ? `View invoice: ${links.invoiceUrl}` : "",
    links.invoicePdf ? `Download PDF: ${links.invoicePdf}` : "",
  ].filter(Boolean).join("\n");
  const invoiceHtml = [
    links.invoiceUrl
      ? `<p><a href="${escapeHtml(links.invoiceUrl)}">View Stripe invoice</a></p>`
      : "",
    links.invoicePdf
      ? `<p><a href="${escapeHtml(links.invoicePdf)}">Download invoice PDF</a></p>`
      : "",
  ].join("");

  await sendEmail({
    to: user.email,
    subject: emailSubject,
    text: `Hi ${user.name || "there"},\n\n${message}${invoiceText ? `\n\n${invoiceText}` : ""}\n\nSmart Manage`,
    html: `<p>Hi ${escapeHtml(user.name || "there")},</p><p>${escapeHtml(message)}</p>${invoiceHtml}<p><strong>Smart Manage</strong></p>`,
  }).catch((error) => console.error("[BILLING/WEBHOOK][EMAIL]", error));
}

export async function POST(req) {
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!webhookSecret.startsWith("whsec_")) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const payload = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      req.headers.get("stripe-signature"),
      webhookSecret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const object = event.data?.object || {};

    if (event.type === "checkout.session.completed" && object.payment_status === "paid") {
      const account = await resolveWebhookAccount({
        userId: object.metadata?.user_id,
        customerId: object.customer,
        subscriptionId: object.subscription,
      });
      const userId = account.userId;
      const plan = object.metadata?.plan || account.plan;
      if (userId && plan) {
        await activateBillingPlan(userId, plan, {
          customerId: object.customer,
          subscriptionId: object.subscription,
          currentPeriodEnd: object.current_period_end
            ? new Date(object.current_period_end * 1000)
            : null,
        });
        await notifyUser(
          userId,
          event,
          "Payment confirmed",
          `Your Smart Manage ${plan} plan is active.`,
          "Smart Manage payment confirmed"
        );
      }
    }

    if (event.type === "invoice.paid") {
      const subscriptionId = subscriptionIdFromInvoice(object);
      const metadata = invoiceSubscriptionMetadata(object);
      const account = await resolveWebhookAccount({
        userId: metadata.user_id,
        customerId: object.customer,
        subscriptionId,
      });
      const userId = account.userId;
      const plan = metadata.plan || account.plan;
      const currentPeriodEnd = invoiceCurrentPeriodEnd(object);
      if (userId && plan) {
        await activateBillingPlan(userId, plan, {
          customerId: object.customer,
          subscriptionId,
          currentPeriodEnd,
        });
      }
      await setSubscriptionStatus(subscriptionId, "active", currentPeriodEnd);
      const result = await pool.query(
        "SELECT user_id, plan FROM subscriptions WHERE stripe_subscription_id=$1 LIMIT 1",
        [subscriptionId]
      );
      if (result.rows[0]) {
        await notifyUser(
          result.rows[0].user_id,
          event,
          "Subscription renewed",
          `Your Smart Manage ${result.rows[0].plan} subscription payment was successful.`,
          "Your Smart Manage invoice",
          {
            invoiceUrl: object.hosted_invoice_url,
            invoicePdf: object.invoice_pdf,
          }
        );
      }
    }

    if (event.type === "invoice.payment_failed") {
      const subscriptionId = subscriptionIdFromInvoice(object);
      await setSubscriptionStatus(subscriptionId, "past_due");
      const result = await pool.query(
        "SELECT user_id, plan FROM subscriptions WHERE stripe_subscription_id=$1 LIMIT 1",
        [subscriptionId]
      );
      if (result.rows[0]) {
        await notifyUser(
          result.rows[0].user_id,
          event,
          "Payment failed",
          `Your Smart Manage ${result.rows[0].plan} payment failed. Please update your payment method.`,
          "Action required: Smart Manage payment failed"
        );
      }
    }

    if (event.type === "customer.subscription.updated") {
      const mappedStatus = object.status === "active" || object.status === "trialing"
        ? "active"
        : object.status === "past_due" || object.status === "unpaid"
          ? "past_due"
          : object.status === "canceled"
            ? "canceled"
            : null;
      const currentPeriodEnd = object.current_period_end
        ? new Date(object.current_period_end * 1000)
        : null;
      if (mappedStatus) {
        await setSubscriptionStatus(object.id, mappedStatus, currentPeriodEnd);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      await setSubscriptionStatus(object.id, "canceled");
      const result = await pool.query(
        "SELECT user_id, plan FROM subscriptions WHERE stripe_subscription_id=$1 LIMIT 1",
        [object.id]
      );
      if (result.rows[0]) {
        await notifyUser(
          result.rows[0].user_id,
          event,
          "Subscription canceled",
          `Your Smart Manage ${result.rows[0].plan} subscription has been canceled.`,
          "Smart Manage subscription canceled"
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[BILLING/WEBHOOK]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
