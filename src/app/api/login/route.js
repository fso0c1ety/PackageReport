import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "../_lib/server";
import { issueEmailOtp } from "../_lib/twoFactor";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json(
        {
          error:
            "Account not set up for password login. Please register again with the same email to set a password.",
        },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
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
