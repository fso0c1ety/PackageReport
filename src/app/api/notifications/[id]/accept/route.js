import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routeParams = await params;
  const notificationId = routeParams?.id;
  if (!notificationId) {
    return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
  }

  try {
    const notifResult = await pool.query(
      "SELECT * FROM notifications WHERE id = $1 AND recipient_id = $2",
      [notificationId, user.id]
    );
    const notification = notifResult.rows[0];

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    if (notification.type !== "invite") {
      return NextResponse.json({ error: "Not an invite" }, { status: 400 });
    }

    const { tableId, permission } = notification.data || {};
    if (!tableId) {
      return NextResponse.json({ error: "Invalid invite data" }, { status: 400 });
    }

    const tableResult = await pool.query("SELECT * FROM tables WHERE id = $1", [tableId]);
    const table = tableResult.rows[0];

    if (table) {
      let sharedUsers = table.shared_users;
      if (!Array.isArray(sharedUsers)) {
        sharedUsers = [];
      }

      if (!sharedUsers.some((u) => u.userId === user.id)) {
        sharedUsers.push({ userId: user.id, permission: permission || "edit" });
        await pool.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [
          JSON.stringify(sharedUsers),
          tableId,
        ]);
      }
    }

    await pool.query("DELETE FROM notifications WHERE id = $1", [notificationId]);

    return NextResponse.json({ success: true, message: "Invite accepted" });
  } catch (err) {
    console.error("[NOTIFICATIONS][ACCEPT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
