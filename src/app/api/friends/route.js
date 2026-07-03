import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT f.id as friendship_id, u.id, u.name, u.email, u.avatar
       FROM friends f
       JOIN users u ON (f.friend_id = u.id AND f.user_id = $1) OR (f.user_id = u.id AND f.friend_id = $1)
       WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'`,
      [user.id]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[FRIENDS][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
