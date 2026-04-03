import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT f.id as request_id, u.id as user_id, u.name, u.email, u.avatar, f.created_at
       FROM friends f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = $1 AND f.status = 'pending'`,
      [user.id]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[FRIENDS][PENDING] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
