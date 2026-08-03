import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_lib/server";
import { REFRESH_COOKIE, revokeUserSessions } from "../../_lib/authSessions";

export const runtime = "nodejs";

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await revokeUserSessions(user.id, user.sid || null, "logout");
  const response = NextResponse.json({ success: true });
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
