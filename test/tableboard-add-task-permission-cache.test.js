const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'TableBoard.tsx'), 'utf8');

test('TableBoard reuses a fresh billing permission response for Add Task visibility', () => {
  assert.match(source, /billing\/status\?tableId=/);
  assert.match(source, /responseCacheTtlMs: 60_000/);
  assert.match(source, /consumeCachedResponse: true/);
  assert.match(source, /userPermission !== 'read'/);
});
