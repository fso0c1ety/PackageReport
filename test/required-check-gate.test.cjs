const { test } = require('node:test');
const assert = require('node:assert/strict');
const { REQUIRED, evaluateGate } = require('../scripts/required-check-gate.cjs');

const code = ['src/app/TableBoard.tsx'];
const docs = ['docs/safety.md'];
const pass = name => [{ name, status: 'completed', conclusion: 'success', completed_at: '2026-10-13T00:00:00Z' }];

test('keeps the exact six public gate names', () => {
  assert.deepEqual(Object.keys(REQUIRED), ['test', 'portal-acceptance', 'kanban-postgres-e2e', 'clean-install', 'local-safety', 'benchmark']);
});
test('documentation may mark heavy gates not applicable but Quality remains required', () => {
  for (const gate of Object.keys(REQUIRED).slice(1)) assert.equal(evaluateGate(gate, docs, []).reason, 'not-applicable-documentation');
  assert.throws(() => evaluateGate('test', docs, []), /BLOCKED/);
  assert.equal(evaluateGate('test', docs, pass('suite-test')).status, 'success');
});
test('code requires a completed successful suite', () => {
  for (const [gate, suite] of Object.entries(REQUIRED)) {
    assert.equal(evaluateGate(gate, code, pass(suite)).status, 'success');
    for (const state of [{ status: 'queued' }, { status: 'completed', conclusion: 'failure' }, { status: 'completed', conclusion: 'cancelled' }, { status: 'completed', conclusion: 'skipped' }]) {
      assert.throws(() => evaluateGate(gate, code, [{ name: suite, ...state }]), /BLOCKED/);
    }
  }
});
test('missing, stale or unknown data fails closed', () => {
  assert.throws(() => evaluateGate('benchmark', code, []), /BLOCKED/);
  assert.throws(() => evaluateGate('other', code, pass('suite-benchmark')), /BLOCKED/);
  assert.throws(() => evaluateGate('benchmark', [], pass('suite-benchmark')), /BLOCKED/);
});
