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
    const { userId } = await params;
    const body = await req.json();
    const payload = {
      callerId: user.id,
      callerName: body?.callerName || "User",
      callerAvatar: body?.callerAvatar || null,
      isVideo: !!body?.isVideo,
      offer: body?.offer || null,
      callId: body?.callId || null,
      sentAt: body?.sentAt || Date.now(),
      type: "incoming_call",
    };

    const notifId = uuidv4();
    await pool.query(
      `
        INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
      [
        notifId,
        userId,
        user.id,
        "incoming_call",
        JSON.stringify(payload),
        false,
      ]
    );

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
        [userId]
      );

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
          "Incoming Call",
          `${payload.callerName} is calling you via ${payload.isVideo ? "Video" : "Audio"}.`,
          payload
        );
      }
    } catch (pushErr) {
      console.error("[CHATS/:userId/call-notification][POST] Push notify failed:", pushErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CHATS/:userId/call-notification][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
