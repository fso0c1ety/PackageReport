import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { requireWritableSubscription } from "../../_lib/billing";

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
            OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=w.id AND wm.user_id::text=$2::text)
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END) AS elem
              WHERE COALESCE(elem->>'userId',elem#>>'{}') = $2
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
    const billingError = await requireWritableSubscription(user.id, { workspaceId });
    if (billingError) return billingError;
    const { name, transferOwnerId } = await req.json();

    const wsResult = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
    const workspace = wsResult.rows[0];

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (transferOwnerId) {
      const target = (await pool.query("SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id::text=$2::text", [workspaceId,String(transferOwnerId)])).rows[0];
      if (!target) return NextResponse.json({ error: "New owner must already be a workspace member" }, { status: 400 });
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("UPDATE workspaces SET owner_id=$1,updated_at=NOW() WHERE id=$2", [String(transferOwnerId),workspaceId]);
        await client.query("UPDATE workspace_members SET workspace_role='admin',role='admin',updated_at=NOW() WHERE workspace_id=$1 AND user_id::text=$2::text", [workspaceId,String(user.id)]);
        await client.query("UPDATE workspace_members SET workspace_role='owner',role='owner',portal_type='standard',landing_route='/dashboard',updated_at=NOW() WHERE workspace_id=$1 AND user_id::text=$2::text", [workspaceId,String(transferOwnerId)]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
      return NextResponse.json({ ...workspace, owner_id: String(transferOwnerId) });
    }

    if (!name || !name.trim()) return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });

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
    const billingError = await requireWritableSubscription(user.id, { workspaceId });
    if (billingError) return billingError;
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
