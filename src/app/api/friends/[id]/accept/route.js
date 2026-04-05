import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

async function acceptFriendRequest(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await pool.query(
      `
        UPDATE friends
        SET status = 'accepted'
        WHERE id = $1 AND friend_id = $2
        RETURNING *
      `,
      [id, user.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    const friendship = result.rows[0];

    try {
      await pool.query(
        `
          INSERT INTO notifications (id, recipient_id, type, data, read, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `,
        [
          randomUUID(),
          friendship.user_id,
          "friend_accepted",
          {
            subject: "Friend Request Accepted",
            body: `${user.name || "Someone"} accepted your friend request.`,
            friendId: user.id,
          },
          false,
        ]
      );
    } catch (notificationErr) {
      console.warn("[FRIENDS][ACCEPT] Notification insert failed:", notificationErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[FRIENDS][ACCEPT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req, context) {
  return acceptFriendRequest(req, context);
}

export async function PUT(req, context) {
  return acceptFriendRequest(req, context);
}
