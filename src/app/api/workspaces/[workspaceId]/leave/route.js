import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspaceId } = await params;
    const workspaceResult = await pool.query("SELECT id FROM workspaces WHERE id = $1", [workspaceId]);

    if (workspaceResult.rows.length === 0) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const tablesResult = await pool.query(
      "SELECT id, shared_users FROM tables WHERE workspace_id = $1",
      [workspaceId]
    );

    for (const table of tablesResult.rows) {
      const sharedUsers = Array.isArray(table.shared_users) ? table.shared_users : [];
      const filteredSharedUsers = sharedUsers.filter((entry) => {
        const entryUserId = typeof entry === "string" ? entry : entry?.userId;
        return entryUserId !== user.id;
      });

      if (filteredSharedUsers.length !== sharedUsers.length) {
        await pool.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [
          JSON.stringify(filteredSharedUsers),
          table.id,
        ]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[WORKSPACE LEAVE][DELETE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
