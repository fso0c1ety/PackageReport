import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { pool } from "../_lib/server";
import {
  ensurePasswordResetTable,
  hashResetToken,
  validatePassword,
} from "../_lib/passwordReset";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "");
  const password = String(body?.password || "");
  if (!token) {
    return NextResponse.json({ error: "Reset token is required" }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  await ensurePasswordResetTable();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [hashResetToken(token)]
    );
    const resetToken = result.rows[0];
    if (!resetToken) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Reset link is invalid or has expired" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await client.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      resetToken.user_id,
    ]);
    await client.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
      [resetToken.user_id]
    );
    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[RESET PASSWORD] Error:", error);
    return NextResponse.json({ error: "Unable to reset password" }, { status: 500 });
  } finally {
    client.release();
  }
}
