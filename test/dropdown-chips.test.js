const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'TableBoard.tsx'), 'utf8');

test('dropdown cells render independent chips for each selected value', () => {
  assert.match(source, /visibleDropdownValues\.map\(\(entry\) => <Chip/);
  assert.match(source, /visibleDropdownValues\.map\(\(entry\) => <Chip key=\{entry\} label=\{entry\}/);
  assert.match(source, /hiddenDropdownCount > 0/);
  assert.match(source, /label=\{`\+\$\{hiddenDropdownCount\}`\}/);
});

test('dropdown popover renders one removable chip per selected value', () => {
  assert.match(source, /selectedDropdownValues\.map\(\(entry\) => <Chip/);
  assert.match(source, /onDelete=\{\(event\) => \{ event\.preventDefault\(\); event\.stopPropagation\(\); handleDropdownOptionSelect\(entry\); \}\}/);
  assert.match(source, /flexWrap: 'wrap'/);
});

test('dropdown chip labels truncate without changing row dimensions', () => {
  assert.match(source, /textOverflow: 'ellipsis'/);
  assert.match(source, /height: 24/);
  assert.match(source, /ROW_HEIGHT_ESTIMATE/);
});
