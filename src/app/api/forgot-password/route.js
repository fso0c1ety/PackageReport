import crypto, { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { pool } from "../_lib/server";
import { sendEmail } from "../_lib/mailer";
import { buildPasswordResetEmail } from "../_lib/emailTemplates";
import {
  ensurePasswordResetTable,
  hashResetToken,
  isValidEmail,
} from "../_lib/passwordReset";

export const runtime = "nodejs";

const genericResponse = {
  success: true,
  message: "If an account exists for this email, a password reset link has been sent.",
};

export async function POST(req) {
  const { email: inputEmail } = await req.json().catch(() => ({}));
  const email = String(inputEmail || "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  try {
    await ensurePasswordResetTable();
    const result = await pool.query(
      "SELECT id, name, email FROM users WHERE LOWER(email) = $1",
      [email]
    );
    const user = result.rows[0];
    if (!user) return NextResponse.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await pool.query(
      "DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < NOW()",
      [user.id]
    );
    await pool.query(
      `INSERT INTO password_reset_tokens
         (id, user_id, token_hash, expires_at, requested_ip)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        randomUUID(),
        user.id,
        hashResetToken(rawToken),
        expiresAt,
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      ]
    );

    const appUrl = String(
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      new URL(req.url).origin
    ).replace(/\/$/, "");
    const resetUrl = `${appUrl}/reset-password/?token=${encodeURIComponent(rawToken)}`;
    const displayName = user.name || "there";

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Smart Manage password",
        text: `Hi ${displayName}, reset your password using this link: ${resetUrl}. This link expires in 30 minutes.`,
        html: buildPasswordResetEmail({ displayName, resetUrl }),
      });
    } catch (emailError) {
      await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user.id]);
      console.error("[FORGOT PASSWORD] Email send failed:", emailError);
      return NextResponse.json(
        { error: "Password reset email service is temporarily unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error("[FORGOT PASSWORD] Error:", error);
    return NextResponse.json(
      { error: "Unable to process password reset request" },
      { status: 500 }
    );
  }
}
