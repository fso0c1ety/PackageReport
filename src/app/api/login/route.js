import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "../_lib/server";
import { issueEmailOtp } from "../_lib/twoFactor";
import { issueSession, refreshCookieOptions, REFRESH_COOKIE } from "../_lib/authSessions";
import { getLoginProtectionState, recordAuthenticationEvent } from "../_lib/loginProtection";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, password, nativeClient = false } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const protection = await getLoginProtectionState(normalizedEmail, req);
    if (protection.retryAfter > 0) {
      return NextResponse.json(
        { error: "Invalid credentials. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(protection.retryAfter) } }
      );
    }
    const result = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    const user = result.rows[0];

    if (!user) {
      await recordAuthenticationEvent({ email: normalizedEmail, eventType: "login_failed", req, metadata: { reason: "invalid_credentials" } });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.password) {
      await recordAuthenticationEvent({ userId: user.id, email: normalizedEmail, eventType: "login_failed", req, metadata: { reason: "invalid_credentials" } });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await recordAuthenticationEvent({ userId: user.id, email: normalizedEmail, eventType: "login_failed", req, metadata: { suspicious: protection.failures >= 3 } });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.two_factor_enabled) {
      const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`;
      const session = await issueSession(user, req);
      await recordAuthenticationEvent({ userId: user.id, email: normalizedEmail, eventType: "login_succeeded", req, metadata: { sessionId: session.sessionId } });
      const safeUser = { ...user };
      delete safeUser.password;
      const response = NextResponse.json({ token: session.token, refreshToken: nativeClient ? session.refreshToken : undefined, sessionId: session.sessionId, user: { ...safeUser, avatar }, requiresTwoFactor: false });
      if (session.refreshToken) response.cookies.set(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions());
      return response;
    }

    const challenge = await issueEmailOtp(user);
    return NextResponse.json({
      requiresTwoFactor: true,
      challengeId: challenge.challengeId,
      expiresInMinutes: challenge.expiresInMinutes,
      emailHint: user.email.replace(/^(.{1,2}).*(@.*)$/, "$1***$2"),
    });
  } catch (err) {
    console.error("[LOGIN] Error:", err);
    return NextResponse.json(
      { error: "Internal server error during login" },
      { status: 500 }
    );
  }
}
