const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(process.cwd(), 'src/app/TableBoard.tsx'), 'utf8');

test('fallback recovery is bounded and never requests an unpaginated board', () => {
  assert.match(source, /tasks\?limit=\$\{FALLBACK_PAGE_SIZE\}&offset=0/);
  assert.match(source, /const FALLBACK_PAGE_SIZE = 100/);
  assert.doesNotMatch(source, /getApiUrl\(`\/tables\/\$\{tableId\}\/tasks`\), \{ suppressNativeErrorAlert/);
});

test('fallback does not discard already loaded pages', () => {
  assert.match(source, /const changed = new Map\(nextRows\.map/);
  assert.match(source, /const merged = currentRows\.map/);
});

test('fallback accepts the paginated API response contract', () => {
  assert.match(source, /Array\.isArray\(data\?\.rows\) \? data\.rows/);
});

test('fallback retains hidden-tab and overlapping-request guards', () => {
  assert.match(source, /fallbackRequestPending \|\| document\.hidden/);
  assert.match(source, /if \(fallbackPollingId\) return/);
});
