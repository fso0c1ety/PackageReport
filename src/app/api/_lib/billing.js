import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { pool } from "./server";

export const INTERNAL_UNLIMITED_EMAILS = [
  "a.gjendzz@gmail.com",
  "valitv7@gmail.com",
  "bleonahalili8@gmail.com",
];

export const PLANS = {
  trial: { seatLimit: 5, amountCents: 0 },
  basic: { seatLimit: 5, price: 40 },
  standard: { seatLimit: 10, price: 75 },
  pro: { seatLimit: 20, price: 180 },
};

export function calculateFinalPrice(desired) {
  if (desired === 0) return 0;
  return Number(((desired + 0.25) / (1 - 0.015)).toFixed(2));
}

export function getPlanCheckoutPrice(plan, billing = "monthly") {
  const config = PLANS[plan];
  if (!config || !config.price) return { amountCents: 0, interval: "month" };
  if (billing === "yearly") {
    const yearlyBase = config.price * 12 * 0.9;
    return { amountCents: Math.round(calculateFinalPrice(yearlyBase) * 100), interval: "year" };
  }
  return { amountCents: Math.round(calculateFinalPrice(config.price) * 100), interval: "month" };
}

export async function getBillingStatus(userId) {
  await pool.query(
    `INSERT INTO subscriptions (id, user_id, plan, status, seat_limit, trial_ends_at)
     VALUES ($1, $2, 'trial', 'trialing', 5, NOW() + INTERVAL '7 days')
     ON CONFLICT (user_id) DO NOTHING`,
    [randomUUID(), userId]
  );
  const subscription = await pool.query("SELECT * FROM subscriptions WHERE user_id = $1", [userId]);
  const seats = await pool.query(
    `SELECT COUNT(DISTINCT member_id)::int AS count FROM (
       SELECT $1::text AS member_id
       UNION
       SELECT elem->>'userId'
       FROM tables t
       JOIN workspaces w ON w.id = t.workspace_id
       CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.shared_users, '[]'::jsonb)) elem
       WHERE w.owner_id = $1 AND elem->>'userId' IS NOT NULL
     ) members`,
    [userId]
  );
  const value = subscription.rows[0];
  const userResult = await pool.query("SELECT LOWER(email) AS email FROM users WHERE id = $1", [userId]);
  const unlimited = INTERNAL_UNLIMITED_EMAILS.includes(userResult.rows[0]?.email || "");

  if (unlimited) {
    await pool.query(
      `UPDATE tables SET billing_archived_at=NULL, billing_purge_at=NULL
       WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id=$1)`,
      [userId]
    );
  }

  const writable = value?.status === "active"
    || (value?.status === "trialing" && new Date(value.trial_ends_at) > new Date())
    || unlimited;
  return {
    ...value,
    status: unlimited ? "active" : value?.status,
    writable,
    unlimited,
    seat_limit: unlimited ? null : value?.seat_limit,
    seats_used: seats.rows[0]?.count || 1,
  };
}

async function resolveBillingOwner(userId, { tableId, workspaceId } = {}) {
  if (tableId) {
    const result = await pool.query(
      `SELECT w.owner_id
       FROM tables t
       JOIN workspaces w ON w.id = t.workspace_id
       WHERE t.id = $1`,
      [tableId]
    );
    return result.rows[0]?.owner_id || userId;
  }

  if (workspaceId) {
    const result = await pool.query("SELECT owner_id FROM workspaces WHERE id = $1", [workspaceId]);
    return result.rows[0]?.owner_id || userId;
  }

  return userId;
}

export async function requireWritableSubscription(userId, scope = {}) {
  const ownerId = await resolveBillingOwner(userId, scope);
  const billing = await getBillingStatus(ownerId);

  if (billing.writable) return null;

  return NextResponse.json(
    {
      error: "Subscription required",
      code: "SUBSCRIPTION_EXPIRED",
      billing,
    },
    { status: 402 }
  );
}

export async function activateBillingPlan(userId, plan, stripe = {}) {
  const config = PLANS[plan];
  if (!config) throw new Error("Invalid plan");
  await getBillingStatus(userId);
  await pool.query(
    `UPDATE subscriptions SET plan=$1, status='active', seat_limit=$2,
       stripe_customer_id=COALESCE($3,stripe_customer_id),
       stripe_subscription_id=COALESCE($4,stripe_subscription_id),
       current_period_end=COALESCE($5,current_period_end),
       archived_at=NULL, purge_at=NULL, updated_at=NOW()
     WHERE user_id=$6`,
    [plan, config.seatLimit, stripe.customerId || null, stripe.subscriptionId || null,
      stripe.currentPeriodEnd || null, userId]
  );
  await pool.query(
    `UPDATE tables SET billing_archived_at=NULL, billing_purge_at=NULL
     WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id=$1)`,
    [userId]
  );
  return getBillingStatus(userId);
}
