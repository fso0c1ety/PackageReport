import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { inviteCode } = await req.json();

    if (!inviteCode) {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
    }

    const tableRes = await pool.query(
      "SELECT * FROM tables WHERE UPPER(invite_code) = $1",
      [String(inviteCode).toUpperCase()]
    );

    const table = tableRes.rows[0];
    if (!table) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    let sharedUsers = Array.isArray(table.shared_users) ? table.shared_users : [];

    if (!sharedUsers.some((entry) => String(entry?.userId) === String(user.id))) {
      sharedUsers = [...sharedUsers, { userId: String(user.id), permission: "edit" }];
      await pool.query(
        "UPDATE tables SET shared_users = $1::jsonb WHERE id = $2",
        [JSON.stringify(sharedUsers), table.id]
      );
    }

    return NextResponse.json({
      success: true,
      tableId: table.id,
      workspaceId: table.workspace_id,
    });
  } catch (err) {
    console.error("[TABLES][JOIN] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
