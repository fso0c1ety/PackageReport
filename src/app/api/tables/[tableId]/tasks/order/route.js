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

    const validTaskIds = orderedTaskIds.filter(
      (id) => typeof id === "string" && id.trim() && id !== "placeholder"
    );

    await pool.query(
      `
        WITH ordered AS (
          SELECT task_id, (position - 1)::int AS row_order
          FROM jsonb_array_elements_text($1::jsonb)
            WITH ORDINALITY AS item(task_id, position)
        )
        UPDATE rows AS row
        SET values = jsonb_set(
          COALESCE(row.values, '{}'::jsonb),
          '{order}',
          to_jsonb(ordered.row_order),
          true
        )
        FROM ordered
        WHERE row.id::text = ordered.task_id
          AND row.table_id = $2
      `,
      [JSON.stringify(validTaskIds), tableId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[TASK ORDER][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
