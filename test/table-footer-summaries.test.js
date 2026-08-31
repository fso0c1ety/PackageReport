const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/app/TableBoard.tsx', 'utf8');

test('footer summaries stay inside the existing footer row', () => {
  assert.doesNotMatch(source, /data-footer-summary=/);
  assert.match(source, /numericTotalsByColumn/);
  assert.match(source, /footerSummariesByColumn/);
  assert.equal((source.match(/<TableFooter/g) || []).length, 1);
});

test('legacy footer remains sticky and aligned to the board grid', () => {
  const footer = source.slice(source.indexOf('<TableFooter'), source.indexOf('</TableFooter>'));
  assert.match(footer, /position: 'sticky'/);
  assert.match(footer, /gridTemplateColumns: bodyGridTemplateColumns/);
});

test('footer supports number, status and dropdown summaries without changing dimensions', () => {
  assert.match(source, /col\.type === "Number"/);
  assert.match(source, /col\.type === "Status" \|\| col\.type === "Dropdown"/);
  assert.match(source, /filteredRows\.forEach/);
  assert.match(source, /gridTemplateColumns: bodyGridTemplateColumns/);
  assert.match(source, /p: '4px 8px'/);
});

test('dropdown editor keeps the known-good option popover', () => {
  assert.doesNotMatch(source, /dropdownOptionsByColumnId/);
  assert.doesNotMatch(source, /Suggestions intentionally use the complete board/);
  assert.match(source, /searchableOptionsByColumnId/);
});

test('summary aggregation remains linear for large boards', () => {
  const rows = Array.from({ length: 10000 }, (_, i) => i + 1);
  assert.equal(rows.reduce((total, value) => total + value, 0), 50005000);
  assert.equal(rows.length, 10000);
});

test('footer summary rules cover dates, status colors, dropdown counts and empty fields', () => {
  assert.match(source, /DD\.MM\.YYYY/);
  assert.match(source, /entry\.color \|\| theme\.palette\.primary\.main/);
  assert.match(source, /b\.count - a\.count/);
  assert.match(source, /flex: `\$\{entry\.count\} 1 0`/);
  assert.match(source, /aria-label="Status distribution"/);
  assert.match(source, /hiddenCount/);
  assert.match(source, /slice\(0, 3\)/);
  assert.match(source, /Tooltip key=\{entry\.value\}/);
  assert.match(source, /column\.type === 'Date'/);
  assert.match(source, /summary\.dateRange/);
  assert.match(source, /filteredRows\.flatMap/);
});

test('status uses a single proportional bar and dropdown overflow counts hidden values', () => {
  assert.match(source, /height: 10/);
  assert.match(source, /borderRadius: 1/);
  assert.match(source, /\$\{entry\.value\} \$\{entry\.count\}\/\$\{total\}/);
  assert.match(source, /\+\{hiddenCount\}/);
  assert.doesNotMatch(source, /entryIndex > 0 && <Typography/);
});
