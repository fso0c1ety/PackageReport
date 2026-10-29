const test = require('node:test');
const assert = require('node:assert/strict');
const { filterExistingRecipients } = require('../server/notificationRecipients');

test('legacy notification helper filters deleted recipients while preserving valid mixed recipients', () => {
  assert.deepEqual(
    filterExistingRecipients(['deleted', 'valid-1', 'valid-2'], [{ id: 'valid-1' }, { id: 'valid-2' }]),
    ['valid-1', 'valid-2'],
  );
});

test('legacy direct notifications cannot insert for a deleted recipient', () => {
  assert.match(require('node:fs').readFileSync('server/notificationHelper.js', 'utf8'), /if \(tokenRes\.rows\.length === 0\) return;/);
});
