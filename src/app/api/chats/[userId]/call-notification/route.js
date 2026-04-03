import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId } = await params;
    const body = await req.json();

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
        JSON.stringify({
          callerId: user.id,
          callerName: body?.callerName || "User",
          callerAvatar: body?.callerAvatar || null,
          isVideo: !!body?.isVideo,
        }),
        false,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CHATS/:userId/call-notification][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
