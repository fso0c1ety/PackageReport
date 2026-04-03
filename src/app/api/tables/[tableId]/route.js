import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;

    const result = await pool.query(
      `
        SELECT t.*, w.owner_id AS workspace_owner_id, w.name AS workspace_name
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
      [tableId, user.id]
    );

    const table = result.rows[0];
    if (!table) {
      return NextResponse.json(
        { error: "Table not found or forbidden" },
        { status: 404 }
      );
    }

    return NextResponse.json(table);
  } catch (err) {
    console.error("[TABLE][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
