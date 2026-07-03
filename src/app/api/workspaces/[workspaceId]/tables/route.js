import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspaceId } = await params;
    const wsResult = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
    const workspace = wsResult.rows[0];

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const sharedTablesCount = await pool.query(
      `SELECT COUNT(*) FROM tables
       WHERE workspace_id = $1
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(shared_users) AS elem
           WHERE elem->>'userId' = $2
         )`,
      [workspaceId, user.id]
    );

    const isOwner = workspace.owner_id === user.id;
    const hasSharedTables = parseInt(sharedTablesCount.rows[0].count, 10) > 0;

    if (!isOwner && !hasSharedTables) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tablesResult = await pool.query(
      `SELECT * FROM tables
       WHERE workspace_id = $1
         AND ($2 = $3 OR EXISTS (
           SELECT 1 FROM jsonb_array_elements(shared_users) AS elem
           WHERE elem->>'userId' = $3
         ))`,
      [workspaceId, workspace.owner_id, user.id]
    );

    return NextResponse.json(tablesResult.rows);
  } catch (err) {
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
    const wsResult = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
    const workspace = wsResult.rows[0];

    if (!workspace || workspace.owner_id !== user.id) {
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
