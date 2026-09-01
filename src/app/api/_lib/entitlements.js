import { NextResponse } from "next/server";
import { pool } from "./server";
import { getBillingStatus } from "./billing";

const GB = 1024 * 1024 * 1024;

const PLAN_ENTITLEMENTS = {
  free: {
    seats: 2,
    workspaces: 1,
    boards: 3,
    dashboards: 1,
    storageBytes: 250 * 1024 * 1024,
    nexusCreditsMonthly: 0,
    automationActionsMonthly: 0,
    activePortals: 0,
  },
  basic: {
    seats: 5,
    workspaces: 3,
    boards: 15,
    dashboards: 3,
    storageBytes: 5 * GB,
    nexusCreditsMonthly: 100,
    automationActionsMonthly: 100,
    activePortals: 1,
  },
  standard: {
    seats: 10,
    workspaces: 10,
    boards: 50,
    dashboards: 10,
    storageBytes: 25 * GB,
    nexusCreditsMonthly: 500,
    automationActionsMonthly: 1000,
    activePortals: 3,
  },
  pro: {
    seats: 20,
    workspaces: 25,
    boards: null,
    dashboards: null,
    storageBytes: 100 * GB,
    nexusCreditsMonthly: 2000,
    automationActionsMonthly: 10000,
    activePortals: 10,
  },
  enterprise: {
    seats: null,
    workspaces: null,
    boards: null,
    dashboards: null,
    storageBytes: null,
    nexusCreditsMonthly: null,
    automationActionsMonthly: null,
    activePortals: null,
  },
  trial: {
    seats: null,
    workspaces: null,
    boards: null,
    dashboards: null,
    storageBytes: null,
    nexusCreditsMonthly: null,
    automationActionsMonthly: null,
    activePortals: null,
  },
  demo: {
    seats: null,
    workspaces: null,
    boards: null,
    dashboards: null,
    storageBytes: null,
    nexusCreditsMonthly: null,
    automationActionsMonthly: null,
    activePortals: null,
  },
};

function monthPeriod(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function normalizePlan(billing) {
  if (billing?.internal_owner || billing?.entitlement === "internal_owner") return "enterprise";
  const raw = String(billing?.plan || "").toLowerCase();
  if (raw === "basic" || raw === "standard" || raw === "pro" || raw === "enterprise") return raw;
  if (raw === "demo") return "demo";
  if (billing?.status === "trialing") return "trial";
  return "free";
}

function planLimit(plan, key) {
  const table = PLAN_ENTITLEMENTS[plan] || PLAN_ENTITLEMENTS.enterprise;
  return table[key] ?? null;
}

function formatLimitError({ resource, currentUsage, limit, plan }) {
  return NextResponse.json({
    error: "Plan limit reached",
    code: "PLAN_LIMIT_REACHED",
    resource,
    currentUsage,
    limit,
    plan,
  }, { status: 402 });
}

async function tableExists(tableName) {
  const result = await pool.query("SELECT to_regclass($1) AS rel", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.rel);
}

export async function ensureEntitlementUsageSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nexus_credit_usage (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id TEXT,
      workspace_id TEXT,
      operation TEXT NOT NULL,
      credits INTEGER NOT NULL,
      period_start TIMESTAMPTZ NOT NULL,
      period_end TIMESTAMPTZ NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS nexus_credit_usage_owner_period_idx
      ON nexus_credit_usage(owner_id, period_start, created_at DESC);

    CREATE TABLE IF NOT EXISTS automation_action_usage (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id TEXT,
      workspace_id TEXT,
      table_id TEXT,
      run_id TEXT,
      actions INTEGER NOT NULL,
      period_start TIMESTAMPTZ NOT NULL,
      period_end TIMESTAMPTZ NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS automation_action_usage_owner_period_idx
      ON automation_action_usage(owner_id, period_start, created_at DESC);
  `);
}

export async function resolveBillingOwnerId(userId, scope = {}) {
  if (scope.tableId) {
    const result = await pool.query(
      `SELECT w.owner_id
       FROM tables t
       JOIN workspaces w ON w.id=t.workspace_id
       WHERE t.id=$1`,
      [scope.tableId],
    );
    if (result.rows[0]?.owner_id) return String(result.rows[0].owner_id);
  }
  if (scope.workspaceId) {
    const result = await pool.query("SELECT owner_id FROM workspaces WHERE id=$1", [scope.workspaceId]);
    if (result.rows[0]?.owner_id) return String(result.rows[0].owner_id);
  }
  return String(userId);
}

async function getWorkspaceUsage(ownerId) {
  const result = await pool.query("SELECT COUNT(*)::int AS count FROM workspaces WHERE owner_id=$1", [ownerId]);
  return Number(result.rows[0]?.count || 0);
}

async function getBoardUsage(ownerId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM tables t
     JOIN workspaces w ON w.id=t.workspace_id
     WHERE w.owner_id=$1`,
    [ownerId],
  );
  return Number(result.rows[0]?.count || 0);
}

async function getDashboardUsage(ownerId) {
  if (!(await tableExists("dashboards"))) return 0;
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM dashboards d
     JOIN workspaces w ON w.id=d.workspace_id
     WHERE w.owner_id=$1`,
    [ownerId],
  );
  return Number(result.rows[0]?.count || 0);
}

async function getSeatUsage(ownerId) {
  const status = await getBillingStatus(ownerId);
  return Number(status?.seats_used || 1);
}

async function getPortalUsage(ownerId) {
  if (!(await tableExists("workspace_members"))) return 0;
  const result = await pool.query(
    `SELECT COUNT(DISTINCT wm.workspace_id || ':' || wm.user_id)::int AS count
     FROM workspace_members wm
     JOIN workspaces w ON w.id=wm.workspace_id
     WHERE w.owner_id=$1 AND LOWER(COALESCE(wm.portal_type,'standard')) <> 'standard'`,
    [ownerId],
  );
  return Number(result.rows[0]?.count || 0);
}

async function getStorageUsage(ownerId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(f.size),0)::bigint AS bytes
     FROM uploaded_files f
     JOIN workspaces w ON w.id=f.workspace_id
     WHERE w.owner_id=$1 AND f.deleted_at IS NULL`,
    [ownerId],
  );
  return Number(result.rows[0]?.bytes || 0);
}

async function getNexusCreditUsage(ownerId) {
  await ensureEntitlementUsageSchema();
  const period = monthPeriod();
  const result = await pool.query(
    `SELECT COALESCE(SUM(credits),0)::int AS credits
     FROM nexus_credit_usage
     WHERE owner_id=$1 AND period_start=$2::timestamptz AND period_end=$3::timestamptz`,
    [ownerId, period.start.toISOString(), period.end.toISOString()],
  );
  return Number(result.rows[0]?.credits || 0);
}

async function getAutomationActionUsage(ownerId) {
  await ensureEntitlementUsageSchema();
  const period = monthPeriod();
  const result = await pool.query(
    `SELECT COALESCE(SUM(actions),0)::int AS actions
     FROM automation_action_usage
     WHERE owner_id=$1 AND period_start=$2::timestamptz AND period_end=$3::timestamptz`,
    [ownerId, period.start.toISOString(), period.end.toISOString()],
  );
  return Number(result.rows[0]?.actions || 0);
}

async function checkUsageLimit(ownerId, resource, usageResolver, nextUnits = 1) {
  const billing = await getBillingStatus(ownerId);
  const plan = normalizePlan(billing);
  const limit = planLimit(plan, resource);
  if (limit == null || billing?.unlimited) return null;
  const currentUsage = await usageResolver(ownerId);
  if (currentUsage + nextUnits <= limit) return null;
  return formatLimitError({ resource, currentUsage, limit, plan });
}

export async function assertWorkspaceCreationAllowed(ownerId) {
  return checkUsageLimit(ownerId, "workspaces", getWorkspaceUsage, 1);
}

export async function assertBoardCreationAllowed(ownerId) {
  return checkUsageLimit(ownerId, "boards", getBoardUsage, 1);
}

export async function assertDashboardCreationAllowed(ownerId, count = 1) {
  return checkUsageLimit(ownerId, "dashboards", getDashboardUsage, Math.max(1, Number(count) || 1));
}

export async function assertStorageUploadAllowed(ownerId, bytesToAdd = 0) {
  return checkUsageLimit(ownerId, "storageBytes", getStorageUsage, Number(bytesToAdd || 0));
}

export async function assertPortalActivationAllowed(ownerId) {
  return checkUsageLimit(ownerId, "activePortals", getPortalUsage, 1);
}

export async function assertSeatAdditionAllowed(ownerId, candidateUserId) {
  const billing = await getBillingStatus(ownerId);
  const plan = normalizePlan(billing);
  const limit = planLimit(plan, "seats");
  if (limit == null || billing?.unlimited) return null;

  const alreadyIncluded = await pool.query(
    `SELECT 1 FROM (
      SELECT $1::text AS user_id
      UNION
      SELECT wm.user_id::text
      FROM workspace_members wm
      JOIN workspaces w ON w.id=wm.workspace_id
      WHERE w.owner_id=$1
      UNION
      SELECT elem->>'userId' AS user_id
      FROM tables t
      JOIN workspaces w ON w.id=t.workspace_id
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.shared_users,'[]'::jsonb)) elem
      WHERE w.owner_id=$1
    ) seats
    WHERE user_id=$2::text
    LIMIT 1`,
    [ownerId, String(candidateUserId)],
  );
  if (alreadyIncluded.rows[0]) return null;

  const currentUsage = await getSeatUsage(ownerId);
  if (currentUsage + 1 <= limit) return null;
  return formatLimitError({ resource: "seats", currentUsage, limit, plan });
}

export function estimateNexusCredits({ input = "", messages = [] } = {}) {
  const textCost = Math.ceil(String(input || "").length / 1200);
  const messageCost = Math.ceil((Array.isArray(messages) ? messages.length : 0) / 4);
  return Math.max(1, Math.min(20, textCost + messageCost));
}

export async function assertNexusCreditsAvailable(ownerId, creditsToConsume) {
  const billing = await getBillingStatus(ownerId);
  const plan = normalizePlan(billing);
  const limit = planLimit(plan, "nexusCreditsMonthly");
  if (limit == null || billing?.unlimited) return null;
  const currentUsage = await getNexusCreditUsage(ownerId);
  if (currentUsage + creditsToConsume <= limit) return null;
  return formatLimitError({ resource: "nexusCredits", currentUsage, limit, plan });
}

export async function recordNexusCredits(ownerId, { actorId, workspaceId, operation, credits, metadata = {} }) {
  await ensureEntitlementUsageSchema();
  const { randomUUID } = await import("crypto");
  const period = monthPeriod();
  await pool.query(
    `INSERT INTO nexus_credit_usage(id,owner_id,actor_id,workspace_id,operation,credits,period_start,period_end,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
    [
      randomUUID(),
      String(ownerId),
      actorId ? String(actorId) : null,
      workspaceId ? String(workspaceId) : null,
      String(operation || "nexus_chat"),
      Number(credits || 0),
      period.start.toISOString(),
      period.end.toISOString(),
      JSON.stringify(metadata || {}),
    ],
  );
}

export async function assertAutomationActionsAvailable(ownerId, actionsToConsume) {
  const billing = await getBillingStatus(ownerId);
  const plan = normalizePlan(billing);
  const limit = planLimit(plan, "automationActionsMonthly");
  if (limit == null || billing?.unlimited) return null;
  const currentUsage = await getAutomationActionUsage(ownerId);
  if (currentUsage + actionsToConsume <= limit) return null;
  return formatLimitError({ resource: "automationActions", currentUsage, limit, plan });
}

export async function recordAutomationActions(ownerId, { actorId, workspaceId, tableId, runId, actions, metadata = {} }) {
  await ensureEntitlementUsageSchema();
  const { randomUUID } = await import("crypto");
  const period = monthPeriod();
  await pool.query(
    `INSERT INTO automation_action_usage(id,owner_id,actor_id,workspace_id,table_id,run_id,actions,period_start,period_end,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
    [
      randomUUID(),
      String(ownerId),
      actorId ? String(actorId) : null,
      workspaceId ? String(workspaceId) : null,
      tableId ? String(tableId) : null,
      runId ? String(runId) : null,
      Number(actions || 0),
      period.start.toISOString(),
      period.end.toISOString(),
      JSON.stringify(metadata || {}),
    ],
  );
}

export async function getBillingUsageSummary(ownerId) {
  const billing = await getBillingStatus(ownerId);
  const plan = normalizePlan(billing);
  const limits = PLAN_ENTITLEMENTS[plan] || PLAN_ENTITLEMENTS.enterprise;
  // Internal owners have a canonical unlimited entitlement. Avoid optional usage
  // tables (dashboards/files/usage ledgers) turning the entire billing payload
  // into a 5xx for one owner while another happens to have complete history.
  if (billing?.internal_owner || billing?.entitlement === "internal_owner") {
    return {
      billing,
      plan: "enterprise",
      limits: PLAN_ENTITLEMENTS.enterprise,
      usage: {
        seats: 0,
        workspaces: 0,
        boards: 0,
        dashboards: 0,
        storageBytes: 0,
        nexusCredits: 0,
        automationActions: 0,
        activePortals: 0,
      },
      period: null,
    };
  }
  const [
    seats,
    workspaces,
    boards,
    dashboards,
    storageBytes,
    nexusCredits,
    automationActions,
    activePortals,
  ] = await Promise.all([
    getSeatUsage(ownerId),
    getWorkspaceUsage(ownerId),
    getBoardUsage(ownerId),
    getDashboardUsage(ownerId),
    getStorageUsage(ownerId),
    getNexusCreditUsage(ownerId),
    getAutomationActionUsage(ownerId),
    getPortalUsage(ownerId),
  ]);

  const period = monthPeriod();
  return {
    billing,
    plan,
    limits,
    usage: {
      seats,
      workspaces,
      boards,
      dashboards,
      storageBytes,
      nexusCredits,
      automationActions,
      activePortals,
    },
    period: {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    },
  };
}
