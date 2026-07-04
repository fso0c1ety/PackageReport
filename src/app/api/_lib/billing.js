import { randomUUID } from "crypto";
import { pool } from "./server";

export const PLANS = {
  trial: { seatLimit: 5, amountCents: 0 },
  basic: { seatLimit: 5, amountCents: 50 },
  standard: { seatLimit: 10, amountCents: 7500 },
  pro: { seatLimit: 20, amountCents: 18000 },
};

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
  const writable = value?.status === "active"
    || (value?.status === "trialing" && new Date(value.trial_ends_at) > new Date());
  return { ...value, writable, seats_used: seats.rows[0]?.count || 1 };
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
