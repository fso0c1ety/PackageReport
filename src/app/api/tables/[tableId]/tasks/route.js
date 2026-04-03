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

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const body = await req.json();

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

    const newTaskId = uuidv4();
    const values = body?.values && typeof body.values === 'object' ? body.values : {};

    const insertRes = await pool.query(
      `
        INSERT INTO rows (id, table_id, values, created_by, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `,
      [newTaskId, tableId, JSON.stringify(values), user.id]
    );

    return NextResponse.json(insertRes.rows[0], { status: 201 });
  } catch (err) {
    console.error("[TABLE TASKS][POST] Error:", err);
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
    const body = await req.json();
    const id = body?.id;
    const values = body?.values;

    if (!id || !values || typeof values !== 'object') {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

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

    const updateRes = await pool.query(
      `
        UPDATE rows
        SET values = $1::jsonb
        WHERE id = $2 AND table_id = $3
        RETURNING *
      `,
      [JSON.stringify(values), id, tableId]
    );

    if (!updateRes.rows[0]) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, task: updateRes.rows[0] });
  } catch (err) {
    console.error("[TABLE TASKS][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
