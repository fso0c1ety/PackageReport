import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

async function getAccessibleTable(tableId, userId) {
  const result = await pool.query(
    `
      SELECT t.id, t.columns
      FROM tables t
      JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.id = $1
        AND (
          w.owner_id = $2
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(t.shared_users, '[]'::jsonb)) AS elem
            WHERE elem->>'userId' = $2
          )
        )
    `,
    [tableId, userId]
  );

  return result.rows[0] || null;
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const table = await getAccessibleTable(tableId, user.id);

    if (!table) {
      return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    }

    return NextResponse.json({ columns: table.columns || [] });
  } catch (err) {
    console.error("[TABLE COLUMNS][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const body = await req.json();
    const columns = body?.columns;

    if (!Array.isArray(columns)) {
      return NextResponse.json({ error: "columns must be an array" }, { status: 400 });
    }

    const table = await getAccessibleTable(tableId, user.id);
    if (!table) {
      return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    }

    await pool.query(
      `UPDATE tables SET columns = $1::jsonb WHERE id = $2`,
      [JSON.stringify(columns), tableId]
    );

    return NextResponse.json({ success: true, columns });
  } catch (err) {
    console.error("[TABLE COLUMNS][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
