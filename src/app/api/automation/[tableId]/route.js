import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { requireWritableSubscription } from "../../_lib/billing";

export const runtime = "nodejs";

function mapAutomationRow(row) {
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
  if (actionType === "webhook" && !/^https:\/\//i.test(String(actionConfig?.webhookUrl || ""))) {
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
  `);
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
    await ensureAutomationSchema();

    const result = await pool.query(
      "SELECT * FROM automations WHERE table_id = $1 ORDER BY id DESC",
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
    const billingError = await requireWritableSubscription(user.id, { tableId });
    if (billingError) return billingError;
    await ensureAutomationSchema();
    const body = await req.json();
    const { id, triggerCol, triggerType, cols, recipients, enabled, taskIds, actionType, actionConfig, rules } = body || {};
    const normalizedActionType = ["email", "notification", "both", "webhook", "create_task"].includes(actionType) ? actionType : "email";
    const normalizedTriggerType = ["column_change", "formula_change"].includes(triggerType) ? triggerType : "column_change";
    const normalizedRules = Array.isArray(rules)
      ? rules.filter((rule) => rule?.value && ["email", "notification", "both", "webhook", "create_task"].includes(rule?.actionType))
      : [];
    const validationError = validateAutomationPayload({ triggerCol, recipients, cols, actionType: normalizedActionType, actionConfig });
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
              updated_at = NOW()
          WHERE id = $11 AND table_id = $12
        `,
        [
          triggerCol,
          enabled,
          toJsonArray(recipients),
          toJsonArray(cols),
          normalizedActionType,
          toJsonArray(taskIds),
          JSON.stringify(normalizedRules),
          JSON.stringify(normalizedRules.map(({ value, actionType: type }) => ({ value, type }))),
          normalizedTriggerType,
          JSON.stringify(actionConfig || {}),
          id,
          tableId,
        ]
      );
    } else {
      const values = [
        tableId,
        toJsonArray(taskIds),
        triggerCol,
        enabled,
        toJsonArray(recipients),
        toJsonArray(cols),
        normalizedActionType,
        JSON.stringify(normalizedRules),
        JSON.stringify(normalizedRules.map(({ value, actionType: type }) => ({ value, type }))),
        user.id,
        normalizedTriggerType,
        JSON.stringify(actionConfig || {}),
      ];
      const idType = await getAutomationIdType();

      // Older installations use SERIAL ids while fresh installations use TEXT ids.
      // Let PostgreSQL generate a SERIAL id instead of attempting to insert a UUID into it.
      if (["smallint", "integer", "bigint"].includes(idType)) {
        await pool.query(
          `INSERT INTO automations
             (table_id, task_ids, trigger_col, enabled, recipients, cols, action_type, conditions, actions, created_by, trigger_type, action_config)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          values
        );
      } else {
        await pool.query(
          `INSERT INTO automations
             (id, table_id, task_ids, trigger_col, enabled, recipients, cols, action_type, conditions, actions, created_by, trigger_type, action_config)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [randomUUID(), ...values]
        );
      }
    }

    const result = await pool.query(
      "SELECT * FROM automations WHERE table_id = $1 ORDER BY id DESC",
      [tableId]
    );

    return NextResponse.json(result.rows.map(mapAutomationRow));
  } catch (err) {
    console.error("[AUTOMATION/:tableId][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
