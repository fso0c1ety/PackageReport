const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CHECKS, classifyChanges, validateGate } = require('../scripts/required-checks-policy.cjs');

test('documentation alone still requires Quality', () => {
  const policy = classifyChanges(['README.md', 'docs/deployment-safety.md']);
  assert.equal(policy.test, 'required');
  for (const check of CHECKS.slice(1)) assert.equal(policy[check], 'not-applicable-documentation');
});
for (const path of ['src/app/apiUrl.ts', 'server/db/migrations/012a_marketplace_base.sql',
  'package-lock.json', '.github/workflows/quality.yml', 'scripts/required-checks-policy.cjs',
  'new-runtime/file.js', 'docs/example.sql', 'supabase/config.toml', 'e2e/portal.spec.ts']) {
  test(`functional or unknown path requires all suites: ${path}`, () => {
    assert.ok(Object.values(classifyChanges([path])).every(value => value === 'required'));
  });
}
test('mixed documentation and code cannot skip suites', () => {
  assert.ok(Object.values(classifyChanges(['README.md', 'src/app/TableBoard.tsx'])).every(value => value === 'required'));
});
test('invalid and incomplete change lists fail closed', () => {
  for (const paths of [null, [], [''], ['../README.md'], ['docs/../README.md'], ['docs\\readme.md']]) {
    assert.throws(() => classifyChanges(paths), /BLOCKED/);
  }
});
test('required suite must execute successfully, never skipped or cancelled', () => {
  const policy = classifyChanges(['src/app/apiUrl.ts']);
  for (const result of ['skipped', 'cancelled', 'failure', undefined]) {
    assert.throws(() => validateGate(policy, 'benchmark', 'success', result), /BLOCKED/);
  }
  assert.equal(validateGate(policy, 'benchmark', 'success', 'success'), true);
});
test('missing detector or invalid policy never permits a green gate', () => {
  const policy = classifyChanges(['docs/safety.md']);
  assert.throws(() => validateGate(policy, 'benchmark', 'failure', 'skipped'), /BLOCKED/);
  assert.throws(() => validateGate({}, 'benchmark', 'success', 'skipped'), /BLOCKED/);
  assert.equal(validateGate(policy, 'benchmark', 'success', 'skipped'), true);
});
