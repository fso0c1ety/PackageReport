import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../../_lib/server";
import { requireWritableSubscription } from "../../../../_lib/billing";
import { requireRowPermission } from "../../../../_lib/authorization";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId, taskId } = await params;

    const access = await requireRowPermission(pool, user.id, taskId, "viewer", tableId);
    if (!access) {
      return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    }
    return NextResponse.json(access.row);
  } catch (err) {
    console.error("[TABLE TASK BY ID][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId, taskId } = await params;
    const billingError = await requireWritableSubscription(user.id, { tableId });
    if (billingError) return billingError;

    const access = await requireRowPermission(pool, user.id, taskId, "editor", tableId);
    if (!access) {
      return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    }

    const deleteRes = await pool.query(
      "DELETE FROM rows WHERE id = $1 AND table_id = $2 RETURNING id",
      [taskId, tableId]
    );

    if (!deleteRes.rows[0]) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[TABLE TASK BY ID][DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
