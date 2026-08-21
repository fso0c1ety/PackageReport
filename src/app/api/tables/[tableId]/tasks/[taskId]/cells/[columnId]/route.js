import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../../../../_lib/server";
import { requireWritableSubscription } from "../../../../../../_lib/billing";
import { requireRowPermission } from "../../../../../../_lib/authorization";
import { broadcastTableInvalidation } from "../../../../../../_lib/tableRealtime";
import { runAutomationWithPlanQuota } from "../../../../../../_lib/automationQuota";
import addressFields from "@/shared/internationalAddress.cjs";
import automationEngine from "../../../../../../../../../server/services/automationEngine";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function PATCH(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tableId, taskId, columnId } = await params;
  const billingError = await requireWritableSubscription(user.id, { tableId });
  if (billingError) return billingError;
  const access = await requireRowPermission(pool, user.id, taskId, "editor", tableId);
  if (!access) return NextResponse.json({ error: "Row not found or forbidden" }, { status: 404 });
  const column = Array.isArray(access.board.columns) && access.board.columns.find((item) => String(item.id) === String(columnId));
  if (!column) return NextResponse.json({ error: "Column not found" }, { status: 404 });

  const body = await req.json();
  if (!Object.prototype.hasOwnProperty.call(body, "value")) return NextResponse.json({ error: "Value is required" }, { status: 400 });
  if (addressFields.isAddressColumn(column)) {
    const validation = addressFields.validateInternationalAddress(body.value);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
    body.value = addressFields.normalizeInternationalAddress(body.value);
  }
  const derivedValues = body.derivedValues && typeof body.derivedValues === "object" && !Array.isArray(body.derivedValues) ? body.derivedValues : {};
  const allowedDerived = Object.fromEntries(Object.entries(derivedValues).filter(([key]) => access.board.columns.some((column) => String(column.id) === key && column.type === "Formula")));
  const patch = { [columnId]: body.value, ...allowedDerived };
  const oldValues = access.row?.values && typeof access.row.values === "object" ? access.row.values : {};
  const result = await pool.query(
    "UPDATE rows SET values=COALESCE(values,'{}'::jsonb) || $3::jsonb, updated_at=NOW() WHERE id=$1 AND table_id=$2 RETURNING *, EXTRACT(EPOCH FROM updated_at)*1000 AS version",
    [taskId, tableId, JSON.stringify(patch)],
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  const newValues = result.rows[0].values && typeof result.rows[0].values === "object" ? result.rows[0].values : { ...oldValues, ...patch };
  const eventId = randomUUID();
  try {
    await runAutomationWithPlanQuota({
      table: access.board,
      rowId: taskId,
      oldValues,
      newValues,
      actorId: String(user.id),
      eventType: "row_updated",
      eventId,
      context: "cell_update",
      runAutomation: automationEngine.runForRowChange,
    });
  } catch (automationError) {
    console.error("[cell-update] automation failed after save", automationError instanceof Error ? automationError.message : "failed");
  }
  const realtimeBroadcasted = await broadcastTableInvalidation(tableId, "UPDATE");
  return NextResponse.json({ success: true, task: result.rows[0], changedColumnId: columnId, version: Number(result.rows[0].version), clientVersion: body.clientVersion ?? null, realtimeBroadcasted, automationEventId: eventId });
}
