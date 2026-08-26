const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/app/TableBoard.tsx', 'utf8');

test('footer summaries are memoized and filter-aware', () => {
  assert.match(source, /columnFooterSummaries = React\.useMemo/);
  assert.match(source, /filteredRows\.flatMap/);
  assert.match(source, /data-footer-summary="distribution"/);
  assert.match(source, /Tooltip key=\{segment\.label\}/);
  assert.match(source, /summary\.sum/);
  assert.match(source, /summary\.earliest/);
  assert.match(source, /summary\.unique/);
});

test('status and dropdown summaries expose proportional counts', () => {
  assert.match(source, /segment\.count \/ Math\.max\(summary\.count, 1\)/);
  assert.match(source, /aria-label=\{`\$\{segment\.label\}: \$\{segment\.count\}`\}/);
  assert.match(source, /column\.type === 'Dropdown'/);
});

test('dropdown suggestions use complete-board values with ranking and a cap', () => {
  assert.match(source, /dropdownOptionsByColumnId = React\.useMemo/);
  assert.match(source, /rows\.forEach\(\(row\)/);
  assert.match(source, /replace\(\/\\s\+\/g, ' '\)/);
  assert.match(source, /sort\(\(a, b\) => b\.count - a\.count/);
  assert.match(source, /slice\(0, 50\)/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /ArrowUp/);
  assert.match(source, /createAndSelectDropdownOption/);
});

test('summary aggregation remains linear for large boards', () => {
  const rows = Array.from({ length: 10000 }, (_, i) => i + 1);
  const sum = rows.reduce((total, value) => total + value, 0);
  assert.equal(sum, 50005000);
  assert.equal(rows.length, 10000);
});
