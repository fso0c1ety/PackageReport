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
              FROM jsonb_array_elements(COALESCE(t.shared_users, '[]'::jsonb)) AS elem
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

async function updateTableName(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const { name } = await req.json();

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Missing or invalid name" }, { status: 400 });
    }

    const result = await pool.query(
      `
        SELECT t.*, w.owner_id AS workspace_owner_id
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE t.id = $1
      `,
      [tableId]
    );

    const table = result.rows[0];
    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const isOwner = table.workspace_owner_id === user.id;
    const isShared = Array.isArray(table.shared_users) && table.shared_users.some((entry) => {
      const entryUserId = typeof entry === 'string' ? entry : entry?.userId;
      return entryUserId === user.id;
    });

    if (!isOwner && !isShared) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await pool.query("UPDATE tables SET name = $1 WHERE id = $2", [String(name).trim(), tableId]);
    return NextResponse.json({ success: true, name: String(name).trim() });
  } catch (err) {
    console.error("[TABLE][UPDATE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req, context) {
  return updateTableName(req, context);
}

export async function PATCH(req, context) {
  return updateTableName(req, context);
}

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const result = await pool.query(
      `
        SELECT t.id, w.owner_id AS workspace_owner_id
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE t.id = $1
      `,
      [tableId]
    );

    const table = result.rows[0];
    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (table.workspace_owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await pool.query("DELETE FROM tables WHERE id = $1", [tableId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[TABLE][DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
