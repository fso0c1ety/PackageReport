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
