import { NextResponse } from "next/server";
import { REFRESH_COOKIE, refreshCookieOptions, rotateSession } from "../../_lib/authSessions";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawToken = String(body.refreshToken || req.cookies.get(REFRESH_COOKIE)?.value || "");
    if (!rawToken) return NextResponse.json({ error: "Refresh token required" }, { status: 401 });
    const session = await rotateSession(rawToken, req);
    if (!session) {
      const response = NextResponse.json({ error: "Refresh session is invalid or expired" }, { status: 401 });
      response.cookies.delete(REFRESH_COOKIE);
      return response;
    }
    const response = NextResponse.json({
      token: session.token,
      refreshToken: body.nativeClient ? session.refreshToken : undefined,
      sessionId: session.sessionId,
    });
    response.cookies.set(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to refresh session" }, { status: 500 });
  }
}
