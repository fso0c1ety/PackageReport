import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { requireWritableSubscription } from "../../_lib/billing";
import automationBuilder from "../../../../../server/services/automationBuilderEngine.cjs";
import { isSafePublicHttpsUrl } from "../../_lib/security";

export const runtime = "nodejs";

function mapAutomationRow(row) {
  const legacyDefinition = automationBuilder.normalizeAutomationDefinition({
    name: row.name, enabled: row.enabled, triggerType: row.trigger_type,
    triggerCol: row.trigger_col, actionType: row.action_type,
    actionConfig: row.action_config, taskIds: row.task_ids,
  });
  const definition = row.definition && Object.keys(row.definition).length
    ? automationBuilder.normalizeAutomationDefinition(row.definition)
    : legacyDefinition;
  return {
    id: row.id,
    tableId: row.table_id,
    taskIds: row.task_ids || (row.task_id ? [row.task_id] : []),
    triggerCol: row.trigger_col,
    enabled: row.enabled,
    recipients: row.recipients,
    cols: row.cols,
    actionType: row.action_type || "email",
    triggerType: row.trigger_type || "column_change",
    actionConfig: row.action_config || {},
    rules: Array.isArray(row.conditions) ? row.conditions : [],
    name: row.name || definition.name,
    definition,
    version: Number(row.version) || definition.version,
    lastRunAt: row.last_run_at || null,
    runCount: Number(row.run_count) || 0,
    failureCount: Number(row.failure_count) || 0,
    history: Array.isArray(row.history) ? row.history : [],
  };
}

function validateAutomationPayload({ triggerCol, recipients, cols, actionType, actionConfig }) {
  if (!triggerCol) {
    return "Trigger column is required";
  }
  if (["email", "notification", "both"].includes(actionType) && (!Array.isArray(recipients) || recipients.length === 0)) {
    return "At least one recipient email is required";
  }
  if (["email", "notification", "both", "webhook"].includes(actionType) && (!Array.isArray(cols) || cols.length === 0)) {
    return "At least one board column must be included in the email";
  }
  if (actionType === "webhook" && !isSafePublicHttpsUrl(String(actionConfig?.webhookUrl || ""))) {
    return "A secure HTTPS webhook URL is required";
  }
  return null;
}

const toJsonArray = (value) => JSON.stringify(Array.isArray(value) ? value : []);

async function ensureAutomationSchema() {
  // Production has had both the original SERIAL schema and the newer TEXT/UUID
  // schema. Keep the API compatible with either and repair missing columns
  // before querying them.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automations (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE automations
      ADD COLUMN IF NOT EXISTS task_id TEXT,
      ADD COLUMN IF NOT EXISTS task_ids JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS trigger_col TEXT,
      ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS recipients JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS cols JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'email',
      ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'column_change',
      ADD COLUMN IF NOT EXISTS action_config JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS created_by TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
      ,ADD COLUMN IF NOT EXISTS name TEXT
      ,ADD COLUMN IF NOT EXISTS definition JSONB DEFAULT '{}'::jsonb
      ,ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1
      ,ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ
      ,ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT 0
      ,ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_runs (
      id TEXT PRIMARY KEY, automation_id TEXT NOT NULL, table_id TEXT, row_id TEXT,
      idempotency_key TEXT, trigger_type TEXT, input JSONB DEFAULT '{}'::jsonb,
      actions JSONB DEFAULT '[]'::jsonb, output JSONB DEFAULT '{}'::jsonb,
      status TEXT DEFAULT 'pending', error_message TEXT, attempt INTEGER DEFAULT 1,
      max_attempts INTEGER DEFAULT 3, scheduled_for TIMESTAMPTZ, started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE automation_runs
      ADD COLUMN IF NOT EXISTS table_id TEXT,
      ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
      ADD COLUMN IF NOT EXISTS trigger_type TEXT,
      ADD COLUMN IF NOT EXISTS input JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS output JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS attempt INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3,
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
  `);
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS automation_runs_idempotency_key_idx ON automation_runs(idempotency_key) WHERE idempotency_key IS NOT NULL");
}

async function authorizeTable(tableId, userId, write = false) {
  const result = await pool.query(`SELECT t.shared_users,w.owner_id FROM tables t JOIN workspaces w ON w.id=t.workspace_id WHERE t.id=$1`, [tableId]);
  const table = result.rows[0];
  if (!table) return false;
  if (String(table.owner_id) === String(userId)) return true;
  const member = (Array.isArray(table.shared_users) ? table.shared_users : []).find((entry) => String(typeof entry === "string" ? entry : entry?.userId) === String(userId));
  if (!member) return false;
  const permission = typeof member === "object" ? member.permission || member.role : "editor";
  return !write || !["viewer", "guest", "read"].includes(String(permission).toLowerCase());
}

async function getAutomationIdType() {
  const schema = await pool.query(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'automations'
      AND column_name = 'id'
    LIMIT 1
  `);
  return schema.rows[0]?.data_type || "text";
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    if (!(await authorizeTable(tableId, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await ensureAutomationSchema();

    const result = await pool.query(
      `SELECT a.*, COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC) FROM (SELECT * FROM automation_runs ar WHERE ar.automation_id=a.id::text ORDER BY ar.created_at DESC LIMIT 20) r),'[]'::jsonb) AS history FROM automations a WHERE table_id = $1 ORDER BY id DESC`,
      [tableId]
    );

    return NextResponse.json(result.rows.map(mapAutomationRow));
  } catch (err) {
    console.error("[AUTOMATION/:tableId][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    if (!(await authorizeTable(tableId, user.id, true))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const billingError = await requireWritableSubscription(user.id, { tableId });
    if (billingError) return billingError;
    await ensureAutomationSchema();
    const body = await req.json();
    const { id, triggerCol, triggerType, cols, recipients, enabled, taskIds, actionType, actionConfig, rules } = body || {};
    const definitionInput = body?.definition || {
      name: body?.name, enabled, triggerType, triggerCol, actionType, actionConfig, taskIds,
      conditions: Array.isArray(body?.conditions) ? body.conditions : [], actions: Array.isArray(body?.actions) ? body.actions : [],
    };
    const definitionResult = automationBuilder.validateAutomationDefinition(definitionInput);
    if (!definitionResult.valid) return NextResponse.json({ error: definitionResult.errors.join(". ") }, { status: 400 });
    const definition = definitionResult.definition;
    if (definition.actions.some((action) => action.type === "call_webhook" && !isSafePublicHttpsUrl(String(action.config?.webhookUrl || "")))) return NextResponse.json({ error: "Webhook must use a safe public HTTPS URL" }, { status: 400 });
    const normalizedActionType = ["email", "notification", "both", "webhook", "create_task", "send_notification", "send_email", "create_row", "create_task", "update_field", "assign_user", "move_row", "duplicate_row", "create_relation", "add_comment", "call_webhook", "archive_row"].includes(actionType) ? actionType : (definition.actions[0]?.type || "send_notification");
    const normalizedTriggerType = triggerType || definition.trigger.type;
    const normalizedRules = Array.isArray(rules)
      ? rules.filter((rule) => rule?.value && ["email", "notification", "both", "webhook", "create_task"].includes(rule?.actionType))
      : [];
    const effectiveTriggerCol = triggerCol || definition.trigger.columnId;
    const legacyDeliveryAction = ["email", "notification", "both", "webhook", "create_task"].includes(normalizedActionType);
    const validationError = legacyDeliveryAction ? validateAutomationPayload({ triggerCol: effectiveTriggerCol, recipients, cols, actionType: normalizedActionType, actionConfig }) : null;
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (id) {
      await pool.query(
        `
          UPDATE automations
          SET trigger_col = $1,
              enabled = $2,
              recipients = $3,
              cols = $4,
              action_type = $5,
              task_ids = $6,
              conditions = $7,
              actions = $8,
              trigger_type = $9,
              action_config = $10,
              name = $11,
              definition = $12,
              version = COALESCE(version,0) + 1,
              updated_at = NOW()
          WHERE id = $13 AND table_id = $14
        `,
        [
          effectiveTriggerCol,
          enabled,
          toJsonArray(recipients),
          toJsonArray(cols),
          normalizedActionType,
          toJsonArray(taskIds),
          JSON.stringify(normalizedRules),
          JSON.stringify(normalizedRules.map(({ value, actionType: type }) => ({ value, type }))),
          normalizedTriggerType,
          JSON.stringify(actionConfig || {}),
          definition.name,
          JSON.stringify(definition),
          id,
          tableId,
        ]
      );
    } else {
      const values = [
        tableId,
        toJsonArray(taskIds),
        effectiveTriggerCol,
        enabled,
        toJsonArray(recipients),
        toJsonArray(cols),
        normalizedActionType,
        JSON.stringify(normalizedRules),
        JSON.stringify(normalizedRules.map(({ value, actionType: type }) => ({ value, type }))),
        user.id,
        normalizedTriggerType,
        JSON.stringify(actionConfig || {}),
        definition.name,
        JSON.stringify(definition),
      ];
      const idType = await getAutomationIdType();

      // Older installations use SERIAL ids while fresh installations use TEXT ids.
      // Let PostgreSQL generate a SERIAL id instead of attempting to insert a UUID into it.
      if (["smallint", "integer", "bigint"].includes(idType)) {
        await pool.query(
          `INSERT INTO automations
             (table_id, task_ids, trigger_col, enabled, recipients, cols, action_type, conditions, actions, created_by, trigger_type, action_config, name, definition)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          values
        );
      } else {
        await pool.query(
          `INSERT INTO automations
             (id, table_id, task_ids, trigger_col, enabled, recipients, cols, action_type, conditions, actions, created_by, trigger_type, action_config, name, definition)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [randomUUID(), ...values]
        );
      }
    }

    const result = await pool.query(
      `SELECT a.*, COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC) FROM (SELECT * FROM automation_runs ar WHERE ar.automation_id=a.id::text ORDER BY ar.created_at DESC LIMIT 20) r),'[]'::jsonb) AS history FROM automations a WHERE table_id = $1 ORDER BY id DESC`,
      [tableId]
    );

    return NextResponse.json(result.rows.map(mapAutomationRow));
  } catch (err) {
    console.error("[AUTOMATION/:tableId][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
