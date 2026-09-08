import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { pool } from "./server";
import internalOwner from "../../../../server/services/internalOwnerEntitlement.js";

export const INTERNAL_OWNER_EMAILS = internalOwner.INTERNAL_OWNER_EMAILS;

const TRIAL_EXTENSION_BY_EMAIL = {
  "ags@ags-logistics.org": "2026-08-05T23:59:59.999+02:00",
};

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
  const userResult = await pool.query("SELECT LOWER(email) AS email FROM users WHERE id = $1", [userId]);
  const accountEmail = userResult.rows[0]?.email || "";
  const extendedTrialEnd = TRIAL_EXTENSION_BY_EMAIL[accountEmail];
  if (extendedTrialEnd) {
    await pool.query(
      `UPDATE subscriptions SET status='trialing', trial_ends_at=$1, archived_at=NULL, purge_at=NULL, updated_at=NOW()
       WHERE user_id=$2 AND plan='trial' AND (trial_ends_at IS NULL OR trial_ends_at < $1)`,
      [extendedTrialEnd, userId]
    );
    await pool.query(
      `UPDATE tables SET billing_archived_at=NULL, billing_purge_at=NULL
       WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id=$1)`,
      [userId]
    );
  }
  const subscription = await pool.query("SELECT * FROM subscriptions WHERE user_id = $1", [userId]);
  const seats = await pool.query(
    `SELECT COUNT(DISTINCT member_id)::int AS count FROM (
       SELECT $1::text AS member_id
       UNION
       SELECT wm.user_id
       FROM workspace_members wm
       JOIN workspaces w ON w.id = wm.workspace_id
       WHERE w.owner_id = $1
     ) members`,
    [userId]
  );
  const value = subscription.rows[0];
  const internalOwnerAccount = internalOwner.isInternalOwnerEmail(accountEmail);
  const unlimited = internalOwnerAccount;

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
    internal_owner: internalOwnerAccount,
    entitlement: internalOwnerAccount ? "internal_owner" : "subscription",
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

export async function getScopedBillingStatus(userId, scope = {}) {
  let workspaceId = scope.workspaceId;
  if (!workspaceId && scope.tableId) workspaceId = (await pool.query("SELECT workspace_id FROM tables WHERE id=$1", [scope.tableId])).rows[0]?.workspace_id;
  if (workspaceId) {
    const demo = (await pool.query(`SELECT w.id,w.demo_expires_at,w.demo_metadata,dr.revoked_at
      FROM workspaces w LEFT JOIN demo_requests dr ON dr.id=w.demo_request_id
      WHERE w.id=$1 AND w.is_demo=TRUE AND (w.owner_id=$2 OR EXISTS(SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=w.id AND wm.user_id=$2))`, [workspaceId, userId])).rows[0];
    if (demo) {
      const revoked = Boolean(demo.revoked_at || demo.demo_metadata?.revoked);
      const expiresAt = demo.demo_expires_at ? new Date(demo.demo_expires_at) : null;
      const expired = revoked || !expiresAt || expiresAt <= new Date();
      return { plan: "demo", status: revoked ? "revoked" : expired ? "expired" : "active", writable: !expired, unlimited: false, is_demo: true, demo_expires_at: demo.demo_expires_at, days_remaining: expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000)) : 0 };
    }
  }
  const ownerId = await resolveBillingOwner(userId, scope);
  return getBillingStatus(ownerId);
}

export async function requireWritableSubscription(userId, scope = {}) {
  const billing = await getScopedBillingStatus(userId, scope);

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
