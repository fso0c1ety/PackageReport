import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { pool, SECRET_KEY } from "./server";

export const REFRESH_COOKIE = "smart_manage_refresh";
export const ACCESS_COOKIE = "smart_manage_access";
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || "20m";
const REFRESH_DAYS = Math.max(1, Number(process.env.REFRESH_TOKEN_DAYS || 30));

export function hashOpaqueToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function signAccessToken(user, sessionId) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, sid: sessionId, tokenType: "access" },
    SECRET_KEY,
    { expiresIn: ACCESS_TTL }
  );
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: REFRESH_DAYS * 24 * 60 * 60,
  };
}

export function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 20 * 60,
  };
}

export async function issueSession(user, req) {
  const sessionId = uuidv4();
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 86400000);
  try {
    await pool.query(
      `INSERT INTO auth_sessions
        (id,user_id,refresh_token_hash,device_name,user_agent,ip_address,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        sessionId,
        user.id,
        hashOpaqueToken(refreshToken),
        String(req.headers.get("x-device-name") || "").slice(0, 120) || null,
        String(req.headers.get("user-agent") || "").slice(0, 500) || null,
        String(req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null,
        expiresAt,
      ]
    );
  } catch (error) {
    if (error?.code !== "42P01" && !/auth_sessions.*does not exist/i.test(String(error?.message || ""))) throw error;
    return {
      token: jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET_KEY, { expiresIn: "24h" }),
      refreshToken: null,
      sessionId: null,
      legacyCompatibility: true,
    };
  }
  return { token: signAccessToken(user, sessionId), refreshToken, sessionId };
}

export async function rotateSession(rawToken, req) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT s.id,s.user_id,u.email,u.name FROM auth_sessions s
       JOIN users u ON u.id=s.user_id
       WHERE s.refresh_token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>NOW()
       FOR UPDATE`,
      [hashOpaqueToken(rawToken)]
    );
    const current = result.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }
    const nextRefreshToken = crypto.randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 86400000);
    await client.query(
      `UPDATE auth_sessions SET refresh_token_hash=$1,expires_at=$2,last_used_at=NOW(),
       user_agent=$3,ip_address=$4 WHERE id=$5`,
      [
        hashOpaqueToken(nextRefreshToken), expiresAt,
        String(req.headers.get("user-agent") || "").slice(0, 500) || null,
        String(req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null,
        current.id,
      ]
    );
    await client.query("COMMIT");
    return {
      token: signAccessToken({ id: current.user_id, email: current.email, name: current.name }, current.id),
      refreshToken: nextRefreshToken,
      sessionId: current.id,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeUserSessions(userId, sessionId, reason) {
  const params = [userId, reason];
  const sessionFilter = sessionId ? " AND id=$3" : "";
  if (sessionId) params.push(sessionId);
  await pool.query(
    `UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW()),revoked_reason=COALESCE(revoked_reason,$2)
     WHERE user_id=$1 AND revoked_at IS NULL${sessionFilter}`,
    params
  );
}
