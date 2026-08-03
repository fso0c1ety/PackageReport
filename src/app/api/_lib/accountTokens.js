import crypto, { randomUUID } from "node:crypto";
import { pool } from "./server";

export function hashAccountToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export async function replaceAccountToken({ table, userId, pendingProfile }) {
  if (!["email_verification_tokens", "account_activation_tokens"].includes(table)) {
    throw new Error("Unsupported account token table");
  }
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.query(`DELETE FROM ${table} WHERE user_id=$1 OR expires_at<NOW()`, [userId]);
  if (table === "account_activation_tokens") {
    await pool.query(
      `INSERT INTO account_activation_tokens (id,user_id,token_hash,pending_profile,expires_at)
       VALUES ($1,$2,$3,$4::jsonb,$5)`,
      [randomUUID(), userId, hashAccountToken(rawToken), JSON.stringify(pendingProfile || {}), expiresAt]
    );
  } else {
    await pool.query(
      `INSERT INTO email_verification_tokens (id,user_id,token_hash,expires_at)
       VALUES ($1,$2,$3,$4)`,
      [randomUUID(), userId, hashAccountToken(rawToken), expiresAt]
    );
  }
  return rawToken;
}

export function publicAppUrl(req) {
  const requestOrigin = new URL(req.url).origin;
  return String(process.env.APP_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || requestOrigin).replace(/\/$/, "");
}
