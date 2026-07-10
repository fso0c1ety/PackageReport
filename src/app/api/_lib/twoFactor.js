import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { pool, SECRET_KEY } from "./server";
import { sendEmail } from "./mailer";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function hashOtp(challengeId, code) {
  return createHmac("sha256", SECRET_KEY)
    .update(`${challengeId}:${code}`)
    .digest("hex");
}

export async function ensureTwoFactorSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_otp_challenges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_auth_otp_user_created
      ON auth_otp_challenges(user_id, created_at DESC);
  `);
}

export async function issueEmailOtp(user) {
  await ensureTwoFactorSchema();
  const challengeId = randomUUID();
  const code = String(randomInt(0, 1000000)).padStart(6, "0");

  await pool.query(
    `UPDATE auth_otp_challenges
     SET consumed_at=NOW()
     WHERE user_id=$1 AND consumed_at IS NULL`,
    [user.id]
  );
  await pool.query(
    `INSERT INTO auth_otp_challenges (id, user_id, code_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 minute'))`,
    [challengeId, user.id, hashOtp(challengeId, code), OTP_TTL_MINUTES]
  );

  try {
    await sendEmail({
      to: user.email,
      subject: "Your Smart Manage verification code",
      text: `Your Smart Manage verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. If you did not try to sign in, change your password immediately.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#0f172a">
          <h2 style="margin:0 0 12px">Confirm your sign in</h2>
          <p>Use this verification code to finish signing in to Smart Manage:</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:8px;background:#eef2ff;padding:18px 22px;border-radius:12px;text-align:center;color:#4f46e5">${code}</div>
          <p style="color:#64748b">This code expires in ${OTP_TTL_MINUTES} minutes and can be used once.</p>
          <p style="color:#64748b">If you did not try to sign in, change your password immediately.</p>
        </div>`,
    });
  } catch (error) {
    await pool.query("DELETE FROM auth_otp_challenges WHERE id=$1", [challengeId]);
    throw error;
  }

  return { challengeId, expiresInMinutes: OTP_TTL_MINUTES };
}

export async function verifyEmailOtp(challengeId, code) {
  await ensureTwoFactorSchema();
  const result = await pool.query(
    `SELECT c.*, u.id AS account_id, u.name, u.email, u.avatar
     FROM auth_otp_challenges c
     JOIN users u ON u.id=c.user_id
     WHERE c.id=$1
     LIMIT 1`,
    [challengeId]
  );
  const challenge = result.rows[0];

  if (!challenge || challenge.consumed_at || new Date(challenge.expires_at) <= new Date()) {
    return { ok: false, status: 400, error: "Verification code expired. Sign in again." };
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return { ok: false, status: 429, error: "Too many incorrect codes. Sign in again." };
  }

  const expected = Buffer.from(challenge.code_hash, "hex");
  const actual = Buffer.from(hashOtp(challengeId, String(code || "")), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    await pool.query("UPDATE auth_otp_challenges SET attempts=attempts+1 WHERE id=$1", [challengeId]);
    return { ok: false, status: 401, error: "Incorrect verification code" };
  }

  await pool.query("UPDATE auth_otp_challenges SET consumed_at=NOW() WHERE id=$1", [challengeId]);
  return {
    ok: true,
    user: {
      id: challenge.account_id,
      name: challenge.name,
      email: challenge.email,
      avatar: challenge.avatar,
    },
  };
}
