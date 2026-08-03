const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '20m';
const REFRESH_TOKEN_DAYS = Math.max(1, Number(process.env.REFRESH_TOKEN_DAYS || 30));

function hashOpaqueToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function newOpaqueToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function signAccessToken(user, secret, sessionId) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, sid: sessionId, tokenType: 'access' },
    secret,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function sessionMetadata(req = {}) {
  return {
    deviceName: String(req.body?.deviceName || req.headers?.['x-device-name'] || '').slice(0, 120) || null,
    userAgent: String(req.headers?.['user-agent'] || '').slice(0, 500) || null,
    ipAddress: req.ip || null,
  };
}

async function createSession(client, user, secret, metadata = {}) {
  const sessionId = uuidv4();
  const refreshToken = newOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 86400000);
  await client.query(
    `INSERT INTO auth_sessions
      (id, user_id, refresh_token_hash, device_name, user_agent, ip_address, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [sessionId, user.id, hashOpaqueToken(refreshToken), metadata.deviceName, metadata.userAgent, metadata.ipAddress, expiresAt]
  );
  return { accessToken: signAccessToken(user, secret, sessionId), refreshToken, sessionId, expiresAt };
}

async function rotateSession(client, rawRefreshToken, secret, metadata = {}) {
  const result = await client.query(
    `SELECT s.id, s.user_id, u.email, u.name
       FROM auth_sessions s JOIN users u ON u.id=s.user_id
      WHERE s.refresh_token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>NOW()
      FOR UPDATE`,
    [hashOpaqueToken(rawRefreshToken)]
  );
  const current = result.rows[0];
  if (!current) return null;

  const nextRefreshToken = newOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 86400000);
  await client.query(
    `UPDATE auth_sessions SET refresh_token_hash=$1, expires_at=$2, last_used_at=NOW(),
       device_name=COALESCE($3,device_name), user_agent=COALESCE($4,user_agent), ip_address=COALESCE($5,ip_address)
     WHERE id=$6`,
    [hashOpaqueToken(nextRefreshToken), expiresAt, metadata.deviceName, metadata.userAgent, metadata.ipAddress, current.id]
  );
  return {
    accessToken: signAccessToken({ id: current.user_id, email: current.email, name: current.name }, secret, current.id),
    refreshToken: nextRefreshToken,
    sessionId: current.id,
    expiresAt,
  };
}

async function revokeSessions(client, userId, { sessionId = null, reason = 'logout' } = {}) {
  const params = [userId, reason];
  let sessionClause = '';
  if (sessionId) {
    params.push(sessionId);
    sessionClause = ' AND id=$3';
  }
  const result = await client.query(
    `UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,NOW()), revoked_reason=COALESCE(revoked_reason,$2)
      WHERE user_id=$1 AND revoked_at IS NULL${sessionClause}`,
    params
  );
  return result.rowCount;
}

module.exports = {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_DAYS,
  createSession,
  hashOpaqueToken,
  newOpaqueToken,
  revokeSessions,
  rotateSession,
  sessionMetadata,
  signAccessToken,
};
