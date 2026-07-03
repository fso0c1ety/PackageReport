import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { friendId } = await params;
    if (!friendId) {
      return NextResponse.json({ error: "Friend ID is required" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT status, user_id as sender_id
       FROM friends
       WHERE (user_id = $1 AND friend_id = $2)
          OR (user_id = $2 AND friend_id = $1)
       LIMIT 1`,
      [user.id, friendId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ status: "none", sender_id: null });
    }

    return NextResponse.json({
      status: result.rows[0].status,
      sender_id: result.rows[0].sender_id,
    });
  } catch (err) {
    console.error("[FRIENDS][STATUS] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
