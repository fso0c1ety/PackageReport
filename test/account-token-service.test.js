const test = require('node:test');
const assert = require('node:assert/strict');
const { hashAccountToken, replaceAccountToken, consumeAccountToken } = require('../server/services/accountTokenService');
const fs = require('node:fs');
const path = require('node:path');

test('account action tokens are hashed and expire', async () => {
  const queries = [];
  const db = { query: async (sql, params) => { queries.push({ sql, params }); return { rows: [] }; } };
  const issued = await replaceAccountToken(db, { table: 'email_verification_tokens', userId: 'u1' });
  assert.notEqual(issued.rawToken, queries[1].params[2]);
  assert.equal(hashAccountToken(issued.rawToken), queries[1].params[2]);
  assert.ok(issued.expiresAt > new Date());
});

test('account security migration preserves legacy text user identifiers', () => {
  const migration = fs.readFileSync(path.join(__dirname, '..', 'server', 'db', 'migrations', '020_account_security.sql'), 'utf8');
  assert.equal((migration.match(/user_id TEXT/g) || []).length, 4);
  assert.doesNotMatch(migration, /user_id UUID/);
});

test('activation pending profile is stored without changing the user', async () => {
  const queries = [];
  const db = { query: async (sql, params) => { queries.push({ sql, params }); return { rows: [] }; } };
  await replaceAccountToken(db, { table: 'account_activation_tokens', userId: 'u1', pendingProfile: { passwordHash: 'hash' } });
  assert.match(queries[1].sql, /pending_profile/);
  assert.equal(JSON.parse(queries[1].params[3]).passwordHash, 'hash');
  assert.equal(queries.some(({ sql }) => /UPDATE users/i.test(sql)), false);
});

test('single-use account token lookup locks the row', async () => {
  const db = { query: async (sql) => ({ rows: sql.includes('FOR UPDATE') ? [{ id: 'token-1' }] : [] }) };
  const token = await consumeAccountToken(db, { table: 'account_activation_tokens', rawToken: 'raw' });
  assert.equal(token.id, 'token-1');
});
