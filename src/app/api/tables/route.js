import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (workspaceId) {
      const workspaceRes = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
      const workspace = workspaceRes.rows[0];

      if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }

      const tablesRes = await pool.query(
        `SELECT 
            t.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', r.id,
                  'table_id', r.table_id,
                  'values', r.values
                )
              ) FILTER (WHERE r.id IS NOT NULL),
              '[]'
            ) AS tasks
         FROM tables t
         LEFT JOIN rows r ON t.id = r.table_id
         WHERE t.workspace_id = $1
           AND ($2 = $3 OR EXISTS (
             SELECT 1
             FROM jsonb_array_elements(COALESCE(t.shared_users, '[]'::jsonb)) AS elem
             WHERE elem->>'userId' = $3
           ))
         GROUP BY t.id`,
        [workspaceId, workspace.owner_id, String(user.id)]
      );

      return NextResponse.json(tablesRes.rows);
    }

    const result = await pool.query(
      `SELECT 
          t.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', r.id,
                'table_id', r.table_id,
                'values', r.values
              )
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'
          ) AS tasks
       FROM tables t
       JOIN workspaces w ON t.workspace_id = w.id
       LEFT JOIN rows r ON t.id = r.table_id
       WHERE w.owner_id = $1 OR COALESCE(t.shared_users, '[]'::jsonb) @> $2::jsonb
       GROUP BY t.id`,
      [String(user.id), JSON.stringify([{ userId: String(user.id) }])]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[TABLES][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { workspaceId, name, columns } = body || {};

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const workspaceRes = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
    const workspace = workspaceRes.rows[0];

    if (!workspace || String(workspace.owner_id) !== String(user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const defaultColumns = [
      { id: randomUUID(), name: "Text", type: "Text", order: 0 },
      {
        id: randomUUID(),
        name: "Status",
        type: "Status",
        order: 1,
        options: [
          { value: "Started", color: "#1976d2" },
          { value: "Working on it", color: "#fdab3d" },
          { value: "Done", color: "#00c875" },
        ],
      },
      { id: randomUUID(), name: "Date", type: "Date", order: 2 },
    ];

    const newTable = {
      id: randomUUID(),
      name: name || "New Table",
      workspace_id: workspaceId,
      columns: Array.isArray(columns) && columns.length > 0 ? columns : defaultColumns,
      created_at: Date.now(),
    };

    await pool.query(
      `INSERT INTO tables (id, name, workspace_id, columns, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [newTable.id, newTable.name, newTable.workspace_id, JSON.stringify(newTable.columns), newTable.created_at]
    );

    return NextResponse.json(newTable);
  } catch (err) {
    console.error("[TABLES][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
