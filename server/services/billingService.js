const { v4: uuidv4 } = require("uuid");
const db = require("../db");

const PLANS = {
  trial: { seatLimit: 1, amountCents: 0 },
  basic: { seatLimit: 5, amountCents: 50 },
  standard: { seatLimit: 10, amountCents: 7500 },
  pro: { seatLimit: 20, amountCents: 18000 },
};

async function ensureSubscription(userId) {
  await db.query(
    `INSERT INTO subscriptions (id, user_id, plan, status, seat_limit, trial_ends_at)
     VALUES ($1, $2, 'trial', 'trialing', 5, NOW() + INTERVAL '7 days')
     ON CONFLICT (user_id) DO NOTHING`,
    [uuidv4(), userId]
  );
  const result = await db.query("SELECT * FROM subscriptions WHERE user_id = $1", [userId]);
  return result.rows[0];
}

function isWritable(subscription) {
  return subscription?.status === "active"
    || (subscription?.status === "trialing" && new Date(subscription.trial_ends_at) > new Date());
}

async function getStatus(userId) {
  const subscription = await ensureSubscription(userId);
  const seats = await db.query(
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
  return { ...subscription, writable: isWritable(subscription), seats_used: seats.rows[0]?.count || 1 };
}

async function assertSeatAvailable(ownerId, candidateUserId) {
  const status = await getStatus(ownerId);
  if (!status.writable) return { allowed: false, reason: "subscription_expired", status };
  const existing = await db.query(
    `SELECT 1 FROM tables t JOIN workspaces w ON w.id=t.workspace_id
     WHERE w.owner_id=$1 AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(COALESCE(t.shared_users,'[]'::jsonb)) e
       WHERE e->>'userId'=$2
     ) LIMIT 1`,
    [ownerId, candidateUserId]
  );
  if (candidateUserId === ownerId || existing.rows.length > 0) return { allowed: true, status };
  return { allowed: status.seats_used < status.seat_limit, reason: "seat_limit", status };
}

async function activatePlan(userId, plan, stripe = {}) {
  const config = PLANS[plan];
  if (!config) throw new Error("Invalid plan");
  await ensureSubscription(userId);
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE subscriptions SET plan=$1, status='active', seat_limit=$2,
       stripe_customer_id=COALESCE($3,stripe_customer_id),
       stripe_subscription_id=COALESCE($4,stripe_subscription_id),
       current_period_end=COALESCE($5,current_period_end),
       archived_at=NULL, purge_at=NULL, updated_at=NOW()
       WHERE user_id=$6`,
      [
        plan,
        config.seatLimit,
        stripe.customerId || null,
        stripe.subscriptionId || null,
        stripe.currentPeriodEnd || null,
        userId,
      ]
    );
    await client.query(
      `UPDATE tables SET billing_archived_at=NULL, billing_purge_at=NULL
       WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id=$1)`,
      [userId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getStatus(userId);
}

async function processTrialLifecycle() {
  await db.query(
    `UPDATE tables t SET billing_archived_at=NOW(), billing_purge_at=NOW()+INTERVAL '30 days'
     FROM workspaces w, subscriptions s
     WHERE t.workspace_id=w.id AND s.user_id=w.owner_id
       AND s.status='trialing' AND s.trial_ends_at<=NOW() AND t.billing_archived_at IS NULL`
  );
  await db.query(
    `UPDATE subscriptions SET status='expired', archived_at=COALESCE(archived_at,NOW()),
     purge_at=COALESCE(purge_at,NOW()+INTERVAL '30 days'), updated_at=NOW()
     WHERE status='trialing' AND trial_ends_at<=NOW()`
  );
  await db.query(
    `UPDATE tables t SET billing_archived_at=NOW(), billing_purge_at=NOW()+INTERVAL '30 days'
     FROM workspaces w, subscriptions s
     WHERE t.workspace_id=w.id AND s.user_id=w.owner_id
       AND s.status IN ('past_due','canceled') AND s.current_period_end<=NOW()
       AND t.billing_archived_at IS NULL`
  );
  await db.query(
    `UPDATE subscriptions SET status='expired', archived_at=COALESCE(archived_at,NOW()),
     purge_at=COALESCE(purge_at,NOW()+INTERVAL '30 days'), updated_at=NOW()
     WHERE status IN ('past_due','canceled') AND current_period_end<=NOW()`
  );
  const purged = await db.query(
    `DELETE FROM tables t USING workspaces w, subscriptions s
     WHERE t.workspace_id=w.id AND s.user_id=w.owner_id
       AND s.status='expired' AND s.purge_at<=NOW()
     RETURNING t.id`
  );
  return purged.rowCount;
}

module.exports = { PLANS, activatePlan, assertSeatAvailable, ensureSubscription, getStatus, isWritable, processTrialLifecycle };
