import { NextResponse } from "next/server";
import { pool } from "../../_lib/server";
import { hashAccountToken } from "../../_lib/accountTokens";

export const runtime = "nodejs";

export async function POST(req) {
  const { token } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT id,user_id FROM email_verification_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE`,
      [hashAccountToken(token)]
    );
    const verification = result.rows[0];
    if (!verification) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Verification link is invalid or has expired" }, { status: 400 });
    }
    await client.query("UPDATE users SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1", [verification.user_id]);
    await client.query("UPDATE email_verification_tokens SET used_at=NOW() WHERE id=$1", [verification.id]);
    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "Email verified successfully." });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: "Unable to verify email" }, { status: 500 });
  } finally { client.release(); }
}
