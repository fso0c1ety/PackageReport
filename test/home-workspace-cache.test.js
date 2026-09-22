const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'home', 'HomeDashboard.tsx'), 'utf8');

test('Home reuses a fresh workspace response for My Workspaces cards', () => {
  assert.match(source, /getApiUrl\("workspaces"\),\s*\{\s*responseCacheTtlMs: 60_000,\s*consumeCachedResponse: true/s);
});
