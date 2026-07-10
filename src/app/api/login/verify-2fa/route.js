import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../../_lib/server";
import { verifyEmailOtp } from "../../_lib/twoFactor";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { challengeId, code } = await req.json();
    if (!challengeId || !/^\d{6}$/.test(String(code || ""))) {
      return NextResponse.json({ error: "Enter the 6-digit verification code" }, { status: 400 });
    }

    const verification = await verifyEmailOtp(challengeId, code);
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    const user = verification.user;
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`;
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    return NextResponse.json({ token, user: { ...user, avatar } });
  } catch (error) {
    console.error("[LOGIN/VERIFY-2FA] Error:", error);
    return NextResponse.json({ error: "Unable to verify the code" }, { status: 500 });
  }
}
