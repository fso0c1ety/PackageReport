import automationEngine from "../../../../server/services/automationEngine";
import { pool } from "./server";
import { getBillingUsageSummary, recordAutomationActions } from "./entitlements";

async function resolveOwnerId(workspaceId) {
  if (!workspaceId) return null;
  const result = await pool.query("SELECT owner_id FROM workspaces WHERE id=$1", [workspaceId]);
  return result.rows[0]?.owner_id ? String(result.rows[0].owner_id) : null;
}

export async function runAutomationWithPlanQuota({
  table,
  rowId,
  oldValues,
  newValues,
  actorId = null,
  eventType = "row_updated",
  eventId = null,
  context = "automation",
  runAutomation = automationEngine.runForRowChange,
}) {
  const workspaceId = String(table?.workspace_id || "");
  const ownerId = await resolveOwnerId(workspaceId);

  if (!ownerId) {
    return runAutomation({ table, rowId, oldValues, newValues, actorId, eventType, eventId });
  }

  try {
    const usage = await getBillingUsageSummary(ownerId);
    const limit = usage?.limits?.automationActionsMonthly;
    const current = Number(usage?.usage?.automationActions || 0);
    const unlimited = usage?.unlimited || limit == null;

    if (!unlimited) {
      const remaining = Math.max(0, Number(limit) - current);
      if (remaining <= 0) {
        return { blocked: true, reason: "automation_limit_reached", consumedActions: 0, stoppedByQuota: true };
      }

      const summary = await runAutomation({
        table,
        rowId,
        oldValues,
        newValues,
        actorId,
        eventType,
        eventId,
        maxActions: remaining,
      });

      const consumedActions = Math.max(0, Number(summary?.consumedActions || 0));
      if (consumedActions > 0) {
        await recordAutomationActions(ownerId, {
          actorId: String(actorId || ownerId),
          workspaceId,
          tableId: String(table?.id || ""),
          runId: String(eventId || ""),
          actions: consumedActions,
          metadata: { context },
        });
      }
      return { ...summary, blocked: false };
    }

    const summary = await runAutomation({ table, rowId, oldValues, newValues, actorId, eventType, eventId });
    const consumedActions = Math.max(0, Number(summary?.consumedActions || 0));
    if (consumedActions > 0) {
      await recordAutomationActions(ownerId, {
        actorId: String(actorId || ownerId),
        workspaceId,
        tableId: String(table?.id || ""),
        runId: String(eventId || ""),
        actions: consumedActions,
        metadata: { context, unlimited: true },
      });
    }
    return { ...summary, blocked: false };
  } catch (error) {
    console.error("[automation-quota] fallback to automation execution", error instanceof Error ? error.message : "failed");
    return runAutomation({ table, rowId, oldValues, newValues, actorId, eventType, eventId });
  }
}
