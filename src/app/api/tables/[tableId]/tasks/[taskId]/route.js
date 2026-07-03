import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../../_lib/server";

export const runtime = "nodejs";

async function canAccessTable(tableId, userId) {
  const accessRes = await pool.query(
    `
      SELECT t.id
      FROM tables t
      JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.id = $1
        AND (
          w.owner_id = $2
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(t.shared_users) AS elem
            WHERE elem->>'userId' = $2
          )
        )
    `,
    [tableId, userId]
  );

  return accessRes.rows.length > 0;
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId, taskId } = await params;

    const allowed = await canAccessTable(tableId, user.id);
    if (!allowed) {
      return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    }

    const result = await pool.query(
      "SELECT * FROM rows WHERE id = $1 AND table_id = $2",
      [taskId, tableId]
    );

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(row);
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

    const allowed = await canAccessTable(tableId, user.id);
    if (!allowed) {
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
