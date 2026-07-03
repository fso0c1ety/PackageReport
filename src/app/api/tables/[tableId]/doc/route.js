import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

async function getAccessibleTable(tableId, userId) {
  const result = await pool.query(
    `
      SELECT t.id, t.doc_content, w.owner_id AS workspace_owner_id
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
      LIMIT 1
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

    return NextResponse.json({ content: table.doc_content || "" });
  } catch (err) {
    console.error("[TABLE DOC][GET] Error:", err);
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
    const table = await getAccessibleTable(tableId, user.id);

    if (!table) {
      return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    }

    const body = await req.json();
    const content = typeof body?.content === "string" ? body.content : "";

    await pool.query("UPDATE tables SET doc_content = $1 WHERE id = $2", [content, tableId]);
    return NextResponse.json({ success: true, content });
  } catch (err) {
    console.error("[TABLE DOC][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
