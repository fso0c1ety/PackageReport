const test = require('node:test');
const assert = require('node:assert/strict');
const { backoffForFailures, getLoginProtectionState } = require('../server/services/loginProtectionService');

test('login backoff grows gradually and stays bounded', () => {
  assert.equal(backoffForFailures(0), 0);
  assert.equal(backoffForFailures(2), 1);
  assert.equal(backoffForFailures(4), 5);
  assert.equal(backoffForFailures(99), 30);
});

test('login protection fails open only while additive audit migration is absent', async () => {
  const missing = { query: async () => { const error = new Error('authentication_audit_events does not exist'); error.code = '42P01'; throw error; } };
  assert.deepEqual(await getLoginProtectionState(missing, { email: 'demo@example.com' }), { failures: 0, retryAfter: 0, suspicious: false });
  const other = { query: async () => { throw new Error('database offline'); } };
  await assert.rejects(() => getLoginProtectionState(other, { email: 'demo@example.com' }), /database offline/);
});
