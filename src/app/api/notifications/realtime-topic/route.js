import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_lib/server";
import { getNotificationRealtimeTopic } from "../../_lib/notificationRealtime";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const topic = getNotificationRealtimeTopic(user.id);
  if (!topic) return NextResponse.json({ error: "Realtime unavailable" }, { status: 503 });
  return NextResponse.json({ topic });
}
