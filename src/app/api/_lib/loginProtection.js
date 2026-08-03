import { randomUUID } from "node:crypto";
import { pool } from "./server";

export function backoffForFailures(count) {
  return [0, 0, 1, 2, 5, 10, 30][Math.min(Math.max(0, Number(count) || 0), 6)];
}

function missingSchema(error) {
  return error?.code === "42P01" || /authentication_audit_events.*does not exist/i.test(String(error?.message || ""));
}

export async function getLoginProtectionState(email, req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS failures,MAX(created_at) AS last_failure FROM authentication_audit_events
       WHERE event_type='login_failed' AND created_at>NOW()-INTERVAL '15 minutes'
       AND (normalized_email=$1 OR ($2::text IS NOT NULL AND ip_address=$2))`,
      [email, ip]
    );
    const failures = result.rows[0]?.failures || 0;
    const seconds = backoffForFailures(failures);
    const last = result.rows[0]?.last_failure ? new Date(result.rows[0].last_failure).getTime() : 0;
    return { failures, retryAfter: Math.max(0, Math.ceil((last + seconds * 1000 - Date.now()) / 1000)) };
  } catch (error) {
    if (missingSchema(error)) return { failures: 0, retryAfter: 0 };
    throw error;
  }
}

export async function recordAuthenticationEvent({ userId = null, email, eventType, req, metadata = {} }) {
  try {
    await pool.query(
      `INSERT INTO authentication_audit_events
       (id,user_id,normalized_email,event_type,ip_address,user_agent,request_id,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,NULL,$7::jsonb)`,
      [randomUUID(), userId, email || null, eventType,
       req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
       String(req.headers.get("user-agent") || "").slice(0,500) || null,
       JSON.stringify(metadata)]
    );
  } catch (error) {
    if (!missingSchema(error)) throw error;
  }
}
