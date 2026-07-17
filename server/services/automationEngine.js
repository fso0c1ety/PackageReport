const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const logger = require("../utils/logger");
const { deliverAutomation, executeBuilderActions } = require("./automationDelivery");
const automationBuilder = require("./automationBuilderEngine.cjs");

const executionRateLimit = automationBuilder.createAutomationRateLimiter({ limit: 100, windowMs: 60_000 });

function changed(oldValues, newValues, columnId) {
  return JSON.stringify(oldValues?.[columnId]) !== JSON.stringify(newValues?.[columnId]);
}

async function createRun({ automationId, tableId, rowId, idempotencyKey }) {
  const result = await db.query(
    `
      INSERT INTO automation_runs (id, automation_id, table_id, row_id, idempotency_key, status, started_at)
      VALUES ($1, $2, $3, $4, $5, 'running', NOW())
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *
    `,
    [uuidv4(), automationId, tableId, rowId, idempotencyKey]
  );
  return result.rows[0];
}

async function finishRun(runId, status, errorMessage = null) {
  await db.query(
    "UPDATE automation_runs SET status = $1, error_message = $2, finished_at = NOW() WHERE id = $3",
    [status, errorMessage, runId]
  );
}

async function runForRowChange({ table, rowId, oldValues, newValues, eventId, depth = 0, actorId = null }) {
  const result = await db.query(
    `
      SELECT *
      FROM automations
      WHERE table_id = $1
        AND enabled = true
        AND (
          task_ids IS NULL
          OR jsonb_array_length(task_ids) = 0
          OR task_ids @> jsonb_build_array($2::text)
        )
      ORDER BY id ASC
    `,
    [table.id, rowId]
  );

  for (const automation of result.rows) {
    const rate = executionRateLimit(`table:${table.id}`);
    if (!rate.allowed) {
      logger.warn("automation_rate_limited", { automationId: automation.id, tableId: table.id });
      continue;
    }
    const triggerCol = automation.trigger_col;
    const storedDefinition = automation.definition && Object.keys(automation.definition).length ? automation.definition : null;
    const definition = storedDefinition ? automationBuilder.normalizeAutomationDefinition(storedDefinition) : null;
    const tableColumns = Array.isArray(table.columns) ? table.columns : (typeof table.columns === "string" ? JSON.parse(table.columns || "[]") : []);
    const triggerColumn = tableColumns.find((column) => column.id === (definition?.trigger?.columnId || triggerCol));
    const plan = definition ? automationBuilder.buildExecutionPlan(definition, { type: "row_updated", oldValues, newValues, columnType: triggerColumn?.type }, { currentUserId: actorId }) : null;
    if (definition && !plan.matched) continue;
    if (!definition && (!triggerCol || !changed(oldValues, newValues, triggerCol))) continue;
    const rules = Array.isArray(automation.conditions) ? automation.conditions : [];
    const matchingRule = rules.find((rule) => String(rule?.value) === String(newValues?.[triggerCol]));
    if (rules.length > 0 && !matchingRule) continue;
    const effectiveAutomation = matchingRule
      ? { ...automation, action_type: matchingRule.actionType || matchingRule.type || automation.action_type }
      : automation;

    const idempotencyKey = eventId
      ? `${automation.id}:${eventId}`
      : `${automation.id}:${rowId}:${triggerCol}:${JSON.stringify(newValues?.[triggerCol])}`;
    const run = await createRun({
      automationId: automation.id,
      tableId: table.id,
      rowId,
      idempotencyKey,
    });

    if (!run || run.status !== "running") continue;

    try {
      if (depth >= 5) throw new Error("Automation loop depth exceeded");
      const delivery = definition
        ? { success: true, results: await executeBuilderActions({ actions: plan.actions, automation: effectiveAutomation, table, rowId, values: newValues, actorId }) }
        : await deliverAutomation({ automation: effectiveAutomation, table, rowId, values: newValues });

      if (delivery.skipped) {
        await finishRun(run.id, "skipped", delivery.reason || "skipped");
        logger.warn("automation_run_skipped", {
          automationId: automation.id,
          tableId: table.id,
          rowId,
          reason: delivery.reason,
        });
        continue;
      }

      await finishRun(run.id, "success");
      await db.query("UPDATE automations SET last_run_at=NOW(),run_count=COALESCE(run_count,0)+1 WHERE id=$1", [automation.id]);
      logger.info("automation_run_success", { automationId: automation.id, tableId: table.id, rowId });
    } catch (err) {
      await finishRun(run.id, "failed", err.message);
      await db.query("UPDATE automations SET last_run_at=NOW(),run_count=COALESCE(run_count,0)+1,failure_count=COALESCE(failure_count,0)+1 WHERE id=$1", [automation.id]);
      logger.error("automation_run_failed", {
        automationId: automation.id,
        tableId: table.id,
        rowId,
        error: err.message,
      });
    }
  }
}

module.exports = {
  runForRowChange,
};
