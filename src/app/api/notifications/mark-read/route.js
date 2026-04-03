import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await pool.query("UPDATE notifications SET read = true WHERE recipient_id = $1", [user.id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[NOTIFICATIONS][MARK_READ] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
