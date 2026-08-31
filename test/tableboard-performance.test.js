const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'TableBoard.tsx'), 'utf8');

test('status/dropdown placement is measured at click time', () => {
  assert.match(source, /const \[statusPopoverUpward, setStatusPopoverUpward\] = useState\(false\)/);
  assert.match(source, /setStatusPopoverUpward\(cellAnchor\.getBoundingClientRect\(\)\.bottom/);
  assert.match(source, /const dropdownShouldOpenUpward = statusPopoverUpward/);
  assert.match(source, /const statusShouldOpenUpward = statusPopoverUpward/);
});

test('status click does not perform a network request before opening', () => {
  const statusBranch = source.slice(source.indexOf('if (effectiveType === "Status")'), source.indexOf('if (effectiveType === "Dropdown")'));
  assert.doesNotMatch(statusBranch, /authenticatedFetch|getApiUrl/);
  assert.match(statusBranch, /onClick=\{activate\}/);
});

test('opening a cell picker does not invalidate every virtual row', () => {
  assert.match(source, /rowStyleSignature: string/);
  assert.match(source, /previous\.rowStyleSignature === next\.rowStyleSignature/);
  assert.match(source, /const rowStyleSignature = React\.useMemo/);
  assert.match(source, /rowStyleSignature=\{rowStyleSignature\}/);
  assert.match(source, /&& !previous\.isInteractive\n\s*&& !next\.isInteractive/);
  assert.doesNotMatch(source, /previous\.displayRenderer === next\.displayRenderer/);
});
