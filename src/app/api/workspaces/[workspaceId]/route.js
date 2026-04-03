import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspaceId } = await params;
    const result = await pool.query(
      `
        SELECT DISTINCT w.*
        FROM workspaces w
        LEFT JOIN tables t ON w.id = t.workspace_id
        WHERE w.id = $1
          AND (
            w.owner_id = $2
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem
              WHERE elem->>'userId' = $2
            )
          )
      `,
      [workspaceId, user.id]
    );

    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "Workspace not found or forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("[WORKSPACE][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspaceId } = await params;
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      );
    }

    const wsResult = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
    const workspace = wsResult.rows[0];

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await pool.query(
      "UPDATE workspaces SET name = $1 WHERE id = $2 RETURNING *",
      [name.trim(), workspaceId]
    );

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("[WORKSPACE][PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
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

    if (workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await pool.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[WORKSPACE][DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
