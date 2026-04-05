import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../../_lib/server";

export const runtime = "nodejs";

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const { orderedTaskIds } = await req.json();

    if (!Array.isArray(orderedTaskIds)) {
      return NextResponse.json({ error: "orderedTaskIds must be array" }, { status: 400 });
    }

    const accessResult = await pool.query(
      `
        SELECT t.id
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
      [tableId, user.id]
    );

    if (accessResult.rows.length === 0) {
      return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    }

    for (let index = 0; index < orderedTaskIds.length; index += 1) {
      await pool.query(
        `
          UPDATE rows
          SET values = jsonb_set(COALESCE(values, '{}'::jsonb), '{order}', $1::jsonb)
          WHERE id = $2 AND table_id = $3
        `,
        [JSON.stringify(index), orderedTaskIds[index], tableId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[TASK ORDER][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
