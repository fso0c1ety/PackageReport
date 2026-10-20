const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(process.cwd(), 'src/app/TableBoard.tsx'), 'utf8');

test('fallback recovery is bounded and never requests an unpaginated board', () => {
  assert.match(source, /tasks\?limit=\$\{FALLBACK_PAGE_SIZE\}&offset=\$\{offset\}/);
  assert.match(source, /for \(let offset = 0; offset < targetCount; offset \+= FALLBACK_PAGE_SIZE\)/);
  assert.match(source, /const FALLBACK_PAGE_SIZE = 100/);
  assert.doesNotMatch(source, /getApiUrl\(`\/tables\/\$\{tableId\}\/tasks`\), \{ suppressNativeErrorAlert/);
});

test('fallback does not discard already loaded pages', () => {
  assert.match(source, /const loadedCount = rowsRef\.current\.filter/);
  assert.match(source, /for \(let offset = 0; offset < targetCount; offset \+= FALLBACK_PAGE_SIZE\)/);
  assert.match(source, /setRows\(nextRows\)/);
  assert.match(source, /setHasMoreRows\(nextRows\.length < totalRows\)/);
});

test('fallback accepts the paginated API response contract', () => {
  assert.match(source, /Array\.isArray\(data\?\.rows\) \? data\.rows/);
  assert.match(source, /if \(offset === 0 && pageRows\.length === 0\) totalRows = 0/);
  assert.match(source, /if \(generation !== recoveryGeneration\) return/);
});

test('fallback retains hidden-tab and overlapping-request guards', () => {
  assert.match(source, /fallbackRequestPending \|\| document\.hidden/);
  assert.match(source, /if \(fallbackPollingId\) return/);
});
