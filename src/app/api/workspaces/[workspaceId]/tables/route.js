import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { requireWritableSubscription } from "../../../_lib/billing";
import { createPerfDiagnostic } from "../../../../../../server/perfDiagnostics.cjs";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const diagnostic = typeof createPerfDiagnostic === "function" ? createPerfDiagnostic("workspace_tables", "tables") : null;
  diagnostic?.mark("auth_start");
  const user = getAuthenticatedUser(req);
  diagnostic?.mark("auth_end");
  if (!user?.id) {
    diagnostic?.finish(401);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspaceId } = await params;
    diagnostic?.mark("authorization_start");
    const wsResult = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
    const workspace = wsResult.rows[0];

    if (!workspace) {
      diagnostic?.mark("authorization_end");
      diagnostic?.finish(404);
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    diagnostic?.mark("authorization_end");

    diagnostic?.mark("query_start");
    const tablesResult = await pool.query(
      `SELECT t.* FROM tables t JOIN workspaces w ON w.id=t.workspace_id
       LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text
       WHERE t.workspace_id=$1 AND (w.owner_id::text=$2::text OR LOWER(COALESCE(wm.role,'')) IN ('owner','admin','logistics_admin') OR EXISTS (
         SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END) elem
         WHERE COALESCE(elem->>'userId',elem#>>'{}')=$2::text
       ))`,
      [workspaceId, String(user.id)]
    );
    diagnostic?.mark("query_end");

    diagnostic?.mark("serialization_start");
    const response = NextResponse.json(tablesResult.rows);
    diagnostic?.mark("serialization_end");
    diagnostic?.finish(200);
    return response;
  } catch (err) {
    diagnostic?.finish(500, err);
    console.error("[WORKSPACE TABLES][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspaceId } = await params;
    const billingError = await requireWritableSubscription(user.id, { workspaceId });
    if (billingError) return billingError;
    const wsResult = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
    const workspace = wsResult.rows[0];

    const canCreate = workspace && (String(workspace.owner_id) === String(user.id) || (await pool.query("SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id::text=$2::text AND (workspace_role='admin' OR (workspace_role='manager' AND allowed_actions @> '[\"create_board\"]'::jsonb))", [workspaceId,String(user.id)])).rows[0]);
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    let columns = body?.columns;

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      columns = [
        { id: uuidv4(), name: "Text", type: "Text", order: 0 },
        {
          id: uuidv4(),
          name: "Status",
          type: "Status",
          order: 1,
          options: [
            { value: "Started", color: "#1976d2" },
            { value: "Working on it", color: "#fdab3d" },
            { value: "Done", color: "#00c875" },
          ],
        },
        { id: uuidv4(), name: "Date", type: "Date", order: 2 },
      ];
    }

    const newTable = {
      id: uuidv4(),
      name: body?.name?.trim() || "Untitled Table",
      workspace_id: workspaceId,
      columns,
      created_at: Date.now(),
      shared_users: [],
    };

    await pool.query(
      "INSERT INTO tables (id, name, workspace_id, columns, created_at, shared_users) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        newTable.id,
        newTable.name,
        newTable.workspace_id,
        JSON.stringify(newTable.columns),
        newTable.created_at,
        JSON.stringify(newTable.shared_users),
      ]
    );

    return NextResponse.json(newTable, { status: 201 });
  } catch (err) {
    console.error("[WORKSPACE TABLES][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
