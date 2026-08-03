import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { ensureFleetDriverAccess, getAuthenticatedUser, pool } from "../_lib/server";
import { requireWritableSubscription } from "../_lib/billing";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureFleetDriverAccess(user);
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
                  'values', r.values,
                  'created_by', r.created_by,
                  'created_at', r.created_at,
                  'creator', CASE
                    WHEN creator.id IS NULL THEN NULL
                    ELSE json_build_object(
                      'id', creator.id,
                      'name', creator.name,
                      'email', creator.email,
                      'avatar', creator.avatar
                    )
                  END
                )
              ) FILTER (WHERE r.id IS NOT NULL),
              '[]'
            ) AS tasks
         FROM tables t
         JOIN workspaces w ON w.id=t.workspace_id
         LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text
         LEFT JOIN board_member_access bma ON bma.table_id=t.id AND bma.user_id::text=$2::text
         LEFT JOIN rows r ON t.id = r.table_id AND smart_manage_row_visible(r.values,r.id::text,r.created_by::text,t.columns,$2::text,
           CASE WHEN w.owner_id::text=$2::text OR COALESCE(wm.workspace_role,wm.role) IN ('owner','admin','logistics_admin') THEN '{"scope":"all_permitted"}'::jsonb ELSE COALESCE(bma.record_access,wm.record_access,'{"scope":"all_permitted"}'::jsonb) END,
           wm.team_id,wm.department_id,wm.company_id)
         LEFT JOIN users creator ON creator.id = r.created_by
         WHERE t.workspace_id = $1
           AND (w.owner_id::text=$2::text OR bma.user_id IS NOT NULL OR COALESCE(wm.workspace_role,wm.role) IN ('owner','admin','logistics_admin') OR EXISTS (
             SELECT 1
             FROM jsonb_array_elements(COALESCE(t.shared_users, '[]'::jsonb)) AS elem
             WHERE elem->>'userId' = $2
           ))
         GROUP BY t.id`,
        [workspaceId, String(user.id)]
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
              'values', r.values,
              'created_by', r.created_by,
              'created_at', r.created_at,
              'creator', CASE
                WHEN creator.id IS NULL THEN NULL
                ELSE json_build_object(
                  'id', creator.id,
                  'name', creator.name,
                  'email', creator.email,
                  'avatar', creator.avatar
                )
              END
            )
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'
          ) AS tasks
       FROM tables t
       JOIN workspaces w ON t.workspace_id = w.id
       LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$1::text
       LEFT JOIN board_member_access bma ON bma.table_id=t.id AND bma.user_id::text=$1::text
       LEFT JOIN rows r ON t.id = r.table_id AND smart_manage_row_visible(r.values,r.id::text,r.created_by::text,t.columns,$1::text,
         CASE WHEN w.owner_id::text=$1::text OR COALESCE(wm.workspace_role,wm.role) IN ('owner','admin','logistics_admin') THEN '{"scope":"all_permitted"}'::jsonb ELSE COALESCE(bma.record_access,wm.record_access,'{"scope":"all_permitted"}'::jsonb) END,
         wm.team_id,wm.department_id,wm.company_id)
       LEFT JOIN users creator ON creator.id = r.created_by
       WHERE w.owner_id::text=$1::text OR bma.user_id IS NOT NULL OR COALESCE(wm.workspace_role,wm.role) IN ('owner','admin','logistics_admin') OR EXISTS (
         SELECT 1
         FROM jsonb_array_elements(COALESCE(t.shared_users, '[]'::jsonb)) AS elem
         WHERE elem->>'userId' = $1
       )
       GROUP BY t.id`,
      [String(user.id)]
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

    const billingError = await requireWritableSubscription(user.id, { workspaceId });
    if (billingError) return billingError;

    const workspaceRes = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
    const workspace = workspaceRes.rows[0];

    const canCreate = workspace && (String(workspace.owner_id) === String(user.id) || (await pool.query("SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id::text=$2::text AND (workspace_role='admin' OR (workspace_role='manager' AND allowed_actions @> '[\"create_board\"]'::jsonb))", [workspaceId,String(user.id)])).rows[0]);
    if (!canCreate) {
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
