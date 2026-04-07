import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  ensureUserNotificationColumns,
  getAuthenticatedUser,
  pool,
} from "../../../_lib/server";
import { sendPushNotification } from "../../../_lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const body = await req.json();

    // Support both keys used across the app/history.
    const recipientId = body?.recipientId || body?.userId;
    const permission = body?.permission || "edit";

    if (!recipientId) {
      return NextResponse.json({ error: "Recipient ID is required" }, { status: 400 });
    }

    const tableRes = await pool.query(
      "SELECT id, name FROM tables WHERE id = $1",
      [tableId]
    );

    if (!tableRes.rows[0]) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const tableName = tableRes.rows[0].name;
    const notifId = uuidv4();

    await pool.query(
      `
        INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
      [
        notifId,
        recipientId,
        user.id,
        "invite",
        JSON.stringify({ tableId, tableName, permission }),
        false,
      ]
    );

    // Push notification (best-effort).
    try {
      await ensureUserNotificationColumns();

      const recipientRes = await pool.query(
        `
          SELECT
            fcm_token,
            fcm_tokens,
            COALESCE(push_notifications, TRUE) AS push_notifications
          FROM users
          WHERE id = $1
        `,
        [recipientId]
      );
      const senderRes = await pool.query("SELECT name FROM users WHERE id = $1", [user.id]);

      const senderName = senderRes.rows[0]?.name || "Someone";
      const tokenSet = new Set();
      const row = recipientRes.rows[0];

      if (row?.push_notifications !== false && row?.fcm_token) tokenSet.add(row.fcm_token);
      if (row?.push_notifications !== false && Array.isArray(row?.fcm_tokens)) {
        row.fcm_tokens.forEach((t) => {
          if (t) tokenSet.add(t);
        });
      }

      const tokens = Array.from(tokenSet);
      if (tokens.length > 0) {
        await sendPushNotification(
          tokens,
          "Table Invite",
          `${senderName} requests you to share this table: ${tableName}`,
          { type: "invite", notificationId: notifId, tableId, permission }
        );
      }
    } catch (pushErr) {
      console.error("[TABLE INVITE][POST] Push notify failed:", pushErr);
    }

    return NextResponse.json({ success: true, message: "Invite sent" });
  } catch (err) {
    console.error("[TABLE INVITE][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
