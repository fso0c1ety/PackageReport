import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { requireWritableSubscription } from "../../../_lib/billing";
import { broadcastNotificationCreated } from "../../../_lib/notificationRealtime";
import { upsertTableMembership } from "../../../_lib/tableMembership";

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

    const { tableId } = notification.data || {};
    if (!tableId) {
      return NextResponse.json({ error: "Invalid invite data" }, { status: 400 });
    }

    const billingError = await requireWritableSubscription(user.id, { tableId });
    if (billingError) return billingError;

    const tableResult = await pool.query("SELECT * FROM tables WHERE id = $1", [tableId]);
    const table = tableResult.rows[0];
    if (!table) return NextResponse.json({ error: "Board no longer exists" }, { status: 404 });
    const data = notification.data || {};
    const client = await pool.connect();
    let acceptanceNotificationId = null;
    try {
      await client.query("BEGIN");
      await upsertTableMembership(client, table, user.id, data);
      if (notification.sender_id && String(notification.sender_id) !== String(user.id)) {
        const accepter = await client.query("SELECT name FROM users WHERE id=$1", [user.id]);
        const accepterName = accepter.rows[0]?.name || "A member";
        const inserted = await client.query(`INSERT INTO notifications
          (id,recipient_id,sender_id,type,data,read,created_at,dedupe_key)
          VALUES($1,$2,$3,'invite_accepted',$4::jsonb,FALSE,NOW(),$5)
          ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING RETURNING id`, [
          randomUUID(), String(notification.sender_id), String(user.id),
          JSON.stringify({
            title: "Invite accepted",
            body: `${accepterName} accepted your invitation to ${table.name || "the board"}.`,
            tableId: table.id,
            tableName: table.name,
            workspaceId: table.workspace_id,
            acceptedUserId: String(user.id),
          }),
          `invite-accepted:${notificationId}`,
        ]);
        acceptanceNotificationId = inserted.rows[0]?.id || null;
      }
      await client.query("DELETE FROM notifications WHERE id=$1", [notificationId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }

    if (acceptanceNotificationId && notification.sender_id) {
      await broadcastNotificationCreated(notification.sender_id, acceptanceNotificationId);
    }

    return NextResponse.json({ success: true, message: "Invite accepted" });
  } catch (err) {
    console.error("[NOTIFICATIONS][ACCEPT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
