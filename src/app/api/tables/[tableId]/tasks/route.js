import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;

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
      [tableId, user.id]
    );

    if (accessRes.rows.length === 0) {
      return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    }

    const result = await pool.query(
      "SELECT * FROM rows WHERE table_id = $1 ORDER BY (values->>'order')::int ASC NULLS FIRST, created_at DESC",
      [tableId]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[TABLE TASKS][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
