import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { friendId } = await req.json();

    if (!friendId) {
      return NextResponse.json({ error: "Friend ID is required" }, { status: 400 });
    }

    if (String(user.id) === String(friendId)) {
      return NextResponse.json({ error: "Cannot add yourself as friend" }, { status: 400 });
    }

    const existing = await pool.query(
      `SELECT id, status
       FROM friends
       WHERE (user_id = $1 AND friend_id = $2)
          OR (user_id = $2 AND friend_id = $1)
       LIMIT 1`,
      [user.id, friendId]
    );

    if (existing.rowCount > 0) {
      return NextResponse.json({
        success: true,
        requestId: existing.rows[0].id,
        status: existing.rows[0].status,
        alreadyExists: true,
      });
    }

    const requestId = randomUUID();
    const result = await pool.query(
      `INSERT INTO friends (id, user_id, friend_id, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING id, status`,
      [requestId, user.id, friendId]
    );

    try {
      await pool.query(
        `INSERT INTO notifications (id, recipient_id, type, data, read, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          randomUUID(),
          friendId,
          "friend_request",
          {
            subject: "New Friend Request",
            body: `${user.name || "Someone"} sent you a friend request.`,
            friendId: user.id,
            requestId: result.rows[0].id,
          },
          false,
        ]
      );
    } catch (notificationErr) {
      console.warn("[FRIENDS][REQUEST] Notification insert failed:", notificationErr);
    }

    return NextResponse.json({
      success: true,
      requestId: result.rows[0].id,
      status: result.rows[0].status,
    });
  } catch (err) {
    console.error("[FRIENDS][REQUEST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
