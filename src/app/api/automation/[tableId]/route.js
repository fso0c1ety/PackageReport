import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { requireWritableSubscription } from "../../_lib/billing";
import automationBuilder from "../../../../../server/services/automationBuilderEngine.cjs";
import { isSafePublicHttpsUrl } from "../../_lib/security";
import { requireBoardPermission } from "../../_lib/authorization";

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

const validAutomationActionTypes = new Set([
  "email", "notification", "both", "webhook", "create_task",
  "send_notification", "send_email", "send_both", "create_row",
  "update_field", "assign_user", "move_row", "duplicate_row",
  "create_relation", "add_comment", "call_webhook", "archive_row",
]);

function normalizeAutomationRules(rules, fallbackActionType) {
  if (!Array.isArray(rules)) return [];
  return rules.flatMap((rule) => {
    const value = rule?.value;
    if (value === null || value === undefined || String(value).trim() === "") return [];
    const actionType = validAutomationActionTypes.has(rule?.actionType)
      ? rule.actionType
      : fallbackActionType;
    return [{ ...rule, value, actionType }];
  });
}


async function authorizeTable(tableId, userId, write = false) {
  return Boolean(await requireBoardPermission(pool, userId, tableId, write ? "editor" : "viewer"));
}

// Shared, bounded schema metadata cache; authorization stays request-local.
import automationSchema from "../../../../../server/db/automationSchema.cjs";
const getAutomationIdType = () => automationSchema.getAutomationIdType(pool);
export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    if (!(await authorizeTable(tableId, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    const normalizedActionType = validAutomationActionTypes.has(actionType) ? actionType : (definition.actions[0]?.type || "send_notification");
    const normalizedTriggerType = triggerType || definition.trigger.type;
    const normalizedRules = normalizeAutomationRules(rules, normalizedActionType);
    const effectiveTriggerCol = triggerCol || definition.trigger.columnId;
    const legacyDeliveryAction = !body?.definition && ["email", "notification", "both", "webhook", "create_task"].includes(normalizedActionType);
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
