import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { requireWritableSubscription } from "../_lib/billing";
import { getWorkspaceTemplate } from "../../../workspaceTemplates";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `
        SELECT DISTINCT 
          w.*, 
          u.name as owner_name, 
          u.avatar as owner_avatar,
          COALESCE(
            (
              SELECT jsonb_agg(jsonb_build_object('id', um.id, 'name', um.name, 'avatar', um.avatar))
              FROM (
                  SELECT DISTINCT (elem->>'userId') as uid
                  FROM tables t2, jsonb_array_elements(t2.shared_users) elem
                  WHERE t2.workspace_id = w.id
              ) distinct_users
              JOIN users um ON um.id = distinct_users.uid
              WHERE um.id != w.owner_id
            ), 
            '[]'::jsonb
          ) as members
        FROM workspaces w
        JOIN users u ON w.owner_id = u.id
        LEFT JOIN tables t ON w.id = t.workspace_id
        WHERE w.owner_id = $1 OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(t.shared_users) AS elem
          WHERE elem->>'userId' = $1
        )
      `,
      [user.id]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[WORKSPACES][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const billingError = await requireWritableSubscription(user.id);
  if (billingError) return billingError;

  try {
    const body = await req.json();
    const template = getWorkspaceTemplate(body?.templateKey);
    const newWorkspace = {
      id: uuidv4(),
      name: body?.name || "Untitled Workspace",
      owner_id: user.id,
    };

    const client = await pool.connect();
    const createdBoards = [];
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)", [newWorkspace.id, newWorkspace.name, newWorkspace.owner_id]);
      for (const board of template.boards) {
        const tableId = uuidv4();
        const columns = board.columns.map((column, order) => ({ ...column, id: uuidv4(), order }));
        await client.query("INSERT INTO tables (id, name, workspace_id, columns, created_at) VALUES ($1,$2,$3,$4,$5)", [tableId, board.name, newWorkspace.id, JSON.stringify(columns), Date.now()]);
        for (const seedRow of board.rows || []) {
          const values = {};
          for (const column of columns) if (Object.prototype.hasOwnProperty.call(seedRow, column.name)) values[column.id] = seedRow[column.name];
          await client.query("INSERT INTO rows(id,table_id,values,created_by,created_at) VALUES($1,$2,$3,$4,NOW())", [uuidv4(), tableId, JSON.stringify(values), user.id]);
        }
        createdBoards.push({ id: tableId, name: board.name });
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return NextResponse.json({ ...newWorkspace, templateKey: template.key, boards: createdBoards });
  } catch (err) {
    console.error("[WORKSPACES][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
