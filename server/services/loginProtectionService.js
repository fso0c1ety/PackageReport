const { v4: uuidv4 } = require('uuid');

const WINDOW_MINUTES = 15;
const BACKOFF_SECONDS = [0, 0, 1, 2, 5, 10, 30];

function backoffForFailures(count) {
  return BACKOFF_SECONDS[Math.min(Math.max(0, Number(count) || 0), BACKOFF_SECONDS.length - 1)];
}

function missingAuditSchema(error) {
  return error?.code === '42P01' || /authentication_audit_events.*does not exist/i.test(String(error?.message || ''));
}

async function getLoginProtectionState(db, { email, ipAddress }) {
  try {
    const result = await db.query(
      `SELECT COUNT(*)::int AS failures, MAX(created_at) AS last_failure
       FROM authentication_audit_events
       WHERE event_type='login_failed' AND created_at>NOW()-INTERVAL '${WINDOW_MINUTES} minutes'
         AND (normalized_email=$1 OR ($2::text IS NOT NULL AND ip_address=$2))`,
      [email, ipAddress || null]
    );
    const failures = result.rows[0]?.failures || 0;
    const seconds = backoffForFailures(failures);
    const lastFailure = result.rows[0]?.last_failure ? new Date(result.rows[0].last_failure).getTime() : 0;
    const retryAfter = Math.max(0, Math.ceil((lastFailure + seconds * 1000 - Date.now()) / 1000));
    return { failures, retryAfter, suspicious: failures >= 3 };
  } catch (error) {
    if (missingAuditSchema(error)) return { failures: 0, retryAfter: 0, suspicious: false };
    throw error;
  }
}

async function recordAuthenticationEvent(db, { userId = null, email, eventType, req, metadata = {} }) {
  try {
    await db.query(
      `INSERT INTO authentication_audit_events
       (id,user_id,normalized_email,event_type,ip_address,user_agent,request_id,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [uuidv4(), userId, email || null, eventType, req?.ip || null,
       String(req?.headers?.['user-agent'] || '').slice(0, 500) || null,
       req?.requestId || null, JSON.stringify(metadata)]
    );
  } catch (error) {
    if (!missingAuditSchema(error)) throw error;
  }
}

module.exports = { backoffForFailures, getLoginProtectionState, recordAuthenticationEvent };
