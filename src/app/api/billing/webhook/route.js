import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { pool } from "../../_lib/server";
import { activateBillingPlan } from "../../_lib/billing";
import { sendEmail } from "../../_lib/mailer";

export const runtime = "nodejs";

function verifyStripeSignature(payload, signatureHeader, secret) {
  const parts = String(signatureHeader || "").split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return signatures.some((signature) => {
    try {
      const actualBuffer = Buffer.from(signature, "hex");
      return actualBuffer.length === expectedBuffer.length
        && timingSafeEqual(actualBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });
}

function subscriptionIdFromInvoice(invoice) {
  return invoice.subscription
    || invoice.parent?.subscription_details?.subscription
    || null;
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

async function notifyUser(userId, event, title, message, emailSubject) {
  if (!userId || await notificationExists(event.id)) return;

  await pool.query(
    `INSERT INTO notifications (id, recipient_id, type, data, read, created_at)
     VALUES ($1, $2, 'billing', $3::jsonb, false, NOW())`,
    [randomUUID(), userId, JSON.stringify({
      stripeEventId: event.id,
      title,
      message,
      billing: true,
    })]
  );

  const userResult = await pool.query(
    "SELECT email, name FROM users WHERE id=$1 LIMIT 1",
    [userId]
  );
  const user = userResult.rows[0];
  if (!user?.email) return;

  await sendEmail({
    to: user.email,
    subject: emailSubject,
    text: `Hi ${user.name || "there"},\n\n${message}\n\nSmart Manage`,
    html: `<p>Hi ${user.name || "there"},</p><p>${message}</p><p><strong>Smart Manage</strong></p>`,
  }).catch((error) => console.error("[BILLING/WEBHOOK][EMAIL]", error));
}

export async function POST(req) {
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!webhookSecret.startsWith("whsec_")) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const object = event.data?.object || {};

    if (event.type === "checkout.session.completed" && object.payment_status === "paid") {
      const userId = object.metadata?.user_id;
      const plan = object.metadata?.plan;
      if (userId && plan) {
        await activateBillingPlan(userId, plan, {
          customerId: object.customer,
          subscriptionId: object.subscription,
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
      await setSubscriptionStatus(subscriptionId, "active");
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
          "Smart Manage subscription renewed"
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
