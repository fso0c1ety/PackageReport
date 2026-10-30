const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { getAutomationIdType } = require('../server/db/automationSchema.cjs');
test('automation request handlers contain no runtime DDL', () => {
  for (const name of ['src/app/api/automation/[tableId]/route.js', 'src/app/api/automation/[tableId]/[id]/route.js']) {
    const code = fs.readFileSync(name, 'utf8');
    assert.doesNotMatch(code, /\b(?:CREATE\s+(?:TABLE|(?:UNIQUE\s+)?INDEX)|ALTER\s+TABLE)\b/i);
    assert.doesNotMatch(code, /information_schema/);
  }
});
test('concurrent ID type requests coalesce per pool, preserving legacy integer IDs', async () => {
  let calls = 0;
  const pool = { query: async () => { calls++; return { rows: [{ data_type: 'integer' }] }; } };
  assert.deepEqual(await Promise.all(Array.from({ length: 100 }, () => getAutomationIdType(pool))), Array(100).fill('integer'));
  assert.equal(calls, 1);
  assert.equal(await getAutomationIdType({ query: async () => ({ rows: [{ data_type: 'text' }] }) }), 'text');
});
test('schema failures are retried and never cached as successful metadata', async () => {
  let calls = 0;
  const pool = { query: async () => { if (++calls === 1) throw new Error('offline'); return { rows: [{ data_type: 'text' }] }; } };
  await assert.rejects(getAutomationIdType(pool), /offline/);
  assert.equal(await getAutomationIdType(pool), 'text');
  assert.equal(calls, 2);
});
