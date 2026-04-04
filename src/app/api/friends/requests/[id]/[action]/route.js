import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../../_lib/server";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, action } = await params;

    if (!id || !action) {
      return NextResponse.json({ error: "Request ID and action are required" }, { status: 400 });
    }

    if (action === "accept") {
      const result = await pool.query(
        `UPDATE friends
         SET status = 'accepted'
         WHERE id = $1 AND friend_id = $2
         RETURNING *`,
        [id, user.id]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
      }

      const friendship = result.rows[0];

      try {
        await pool.query(
          `INSERT INTO notifications (id, recipient_id, type, data, read, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
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
        console.warn("[FRIENDS][REQUESTS][ACCEPT] Notification insert failed:", notificationErr);
      }

      return NextResponse.json({ success: true });
    }

    if (action === "reject" || action === "decline") {
      const result = await pool.query(
        `DELETE FROM friends
         WHERE id = $1 AND (user_id = $2 OR friend_id = $2)
         RETURNING id`,
        [id, user.id]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Connection not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[FRIENDS][REQUESTS] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
