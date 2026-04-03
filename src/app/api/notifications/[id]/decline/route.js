import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routeParams = await params;
  const notificationId = routeParams?.id;
  if (!notificationId) {
    return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
  }

  try {
    await pool.query("DELETE FROM notifications WHERE id = $1 AND recipient_id = $2", [
      notificationId,
      user.id,
    ]);
    return NextResponse.json({ success: true, message: "Invite declined" });
  } catch (err) {
    console.error("[NOTIFICATIONS][DECLINE] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
