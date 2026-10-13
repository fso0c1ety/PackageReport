const { test } = require('node:test');
const assert = require('node:assert/strict');
const { GATES, detect } = require('../scripts/required-check-detector.cjs');
const sha = 'a'.repeat(40);

test('requires exact six public gates and full SHA values', () => {
  assert.deepEqual(GATES, ['test', 'portal-acceptance', 'kanban-postgres-e2e', 'clean-install', 'local-safety', 'benchmark']);
  assert.throws(() => detect({base: 'a', head: sha, files: [{filename: 'README.md', status: 'modified'}]}), /BLOCKED/);
});
test('only markdown is not heavy', () => {
  assert.equal(detect({base: sha, head: sha, files: [{filename: 'docs/safety.md', status: 'modified'}]}).heavy, false);
});
test('code, SQL, workflow and unknown files are heavy', () => {
  for (const filename of ['src/App.tsx', 'server/db/migrations/001.sql', '.github/workflows/x.yml', 'unknown.bin']) {
    assert.equal(detect({base: sha, head: sha, files: [{filename, status: 'added'}]}).heavy, true);
  }
});
test('renamed code to docs remains heavy and deleted files are covered', () => {
  assert.equal(detect({base: sha, head: sha, files: [{filename: 'docs/x.md', previous_filename: 'src/x.ts', status: 'renamed'}]}).heavy, true);
  assert.equal(detect({base: sha, head: sha, files: [{filename: 'src/removed.ts', status: 'deleted'}]}).heavy, true);
});
test('incomplete or malformed diff fails closed', () => {
  for (const files of [null, [], [{filename: 'x', status: 'unknown'}], [{filename: 'docs/x.md', status: 'renamed'}]]) {
    assert.throws(() => detect({base: sha, head: sha, files}), /BLOCKED/);
  }
});
