import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { sendPushNotification } from "../../_lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId } = await params;
    const result = await pool.query(
      `
        SELECT *
        FROM direct_messages
        WHERE (sender_id = $1 AND recipient_id = $2)
           OR (sender_id = $2 AND recipient_id = $1)
        ORDER BY timestamp ASC
      `,
      [user.id, userId]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[CHATS/:userId][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId } = await params;
    const body = await req.json();
    const text = body?.text?.trim();

    if (!text) {
      return NextResponse.json({ error: "Message text is required" }, { status: 400 });
    }

    if (user.id === userId) {
      return NextResponse.json({ error: "You cannot message yourself" }, { status: 400 });
    }

    const message = {
      id: uuidv4(),
      sender_id: user.id,
      recipient_id: userId,
      text,
      timestamp: new Date(),
      read: false,
    };

    await pool.query(
      "INSERT INTO direct_messages (id, sender_id, recipient_id, text, timestamp, read) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        message.id,
        message.sender_id,
        message.recipient_id,
        message.text,
        message.timestamp,
        message.read,
      ]
    );

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
        "direct_message",
        JSON.stringify({ text: message.text, senderId: user.id }),
        false,
      ]
    );

    try {
      const recipientRes = await pool.query(
        "SELECT fcm_token, fcm_tokens FROM users WHERE id = $1",
        [userId]
      );
      const senderRes = await pool.query("SELECT name FROM users WHERE id = $1", [user.id]);

      const senderName = senderRes.rows[0]?.name || "Someone";
      const tokenSet = new Set();
      const row = recipientRes.rows[0];

      if (row?.fcm_token) tokenSet.add(row.fcm_token);
      if (Array.isArray(row?.fcm_tokens)) {
        row.fcm_tokens.forEach((t) => {
          if (t) tokenSet.add(t);
        });
      }

      const tokens = Array.from(tokenSet);
      if (tokens.length > 0) {
        await sendPushNotification(tokens, "New Message", `${senderName}: ${message.text}`, {
          type: "direct_message",
          senderId: user.id,
        });
      }
    } catch (pushErr) {
      console.error("[CHATS/:userId][POST] Push notify failed:", pushErr);
    }

    return NextResponse.json(message);
  } catch (err) {
    console.error("[CHATS/:userId][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
