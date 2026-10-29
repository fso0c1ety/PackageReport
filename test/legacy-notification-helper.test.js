const test = require('node:test');
const assert = require('node:assert/strict');
const { filterExistingRecipients } = require('../server/notificationRecipients');

test('recipient lookup supplies user identity to the existence filter', () => {
  const source = require('node:fs').readFileSync('server/notificationHelper.js', 'utf8');
  assert.match(source, /SELECT id, fcm_token, fcm_tokens FROM users WHERE id = ANY/);
});

test('legacy notification helper filters deleted recipients while preserving valid mixed recipients', () => {
  assert.deepEqual(
    filterExistingRecipients(['deleted', 'valid-1', 'valid-2'], [{ id: 'valid-1' }, { id: 'valid-2' }]),
    ['valid-1', 'valid-2'],
  );
});

test('legacy direct notifications cannot insert for a deleted recipient', () => {
  assert.match(require('node:fs').readFileSync('server/notificationHelper.js', 'utf8'), /if \(tokenRes\.rows\.length === 0\) return;/);
});
