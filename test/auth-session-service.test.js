const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const {
  createSession,
  hashOpaqueToken,
  rotateSession,
  revokeSessions,
} = require('../server/services/authSessionService');

test('refresh tokens are stored only as irreversible hashes', async () => {
  const queries = [];
  const client = { query: async (sql, params) => { queries.push({ sql, params }); return { rows: [], rowCount: 1 }; } };
  const session = await createSession(client, { id: 'user-1', email: 'demo@example.com', name: 'Demo' }, 'test-secret');
  assert.notEqual(session.refreshToken, queries[0].params[2]);
  assert.equal(queries[0].params[2], hashOpaqueToken(session.refreshToken));
  assert.equal(jwt.verify(session.accessToken, 'test-secret').tokenType, 'access');
});

test('refresh rotation replaces the stored hash and preserves the session', async () => {
  const queries = [];
  const client = { query: async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('FROM auth_sessions')) return { rows: [{ id: 'session-1', user_id: 'user-1', email: 'demo@example.com', name: 'Demo' }] };
    return { rows: [], rowCount: 1 };
  } };
  const rotated = await rotateSession(client, 'old-refresh-token', 'test-secret');
  assert.equal(rotated.sessionId, 'session-1');
  assert.notEqual(rotated.refreshToken, 'old-refresh-token');
  assert.equal(queries[1].params[0], hashOpaqueToken(rotated.refreshToken));
});

test('session revocation can target one device or every device', async () => {
  const queries = [];
  const client = { query: async (sql, params) => { queries.push({ sql, params }); return { rowCount: 2 }; } };
  await revokeSessions(client, 'user-1', { sessionId: 'session-1' });
  await revokeSessions(client, 'user-1', { reason: 'password_change' });
  assert.match(queries[0].sql, /AND id=\$3/);
  assert.doesNotMatch(queries[1].sql, /AND id=\$3/);
});
