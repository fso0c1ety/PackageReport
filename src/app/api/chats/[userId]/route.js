import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser, pool } from "../../_lib/server";

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

    return NextResponse.json(message);
  } catch (err) {
    console.error("[CHATS/:userId][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
