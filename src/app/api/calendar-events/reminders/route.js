import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const count = await pool.query("SELECT COUNT(*)::int AS count FROM calendar_events WHERE user_id=$1 AND reminder_sent_at IS NOT NULL AND reminder_read_at IS NULL", [user.id]);
    return NextResponse.json({ count: count.rows[0]?.count || 0, triggered: [] });
  } catch (error) {
    console.error("[CALENDAR][REMINDERS]", error);
    return NextResponse.json({ error: "Unable to check reminders" }, { status: 500 });
  }
}
