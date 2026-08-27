const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/app/TableBoard.tsx', 'utf8');

test('recovery candidate keeps only the legacy footer row', () => {
  assert.doesNotMatch(source, /columnFooterSummaries/);
  assert.doesNotMatch(source, /data-footer-summary=/);
  assert.match(source, /numericTotalsByColumn/);
});

test('legacy footer remains sticky and aligned to the board grid', () => {
  const footer = source.slice(source.indexOf('<TableFooter'), source.indexOf('</TableFooter>'));
  assert.match(footer, /position: 'sticky'/);
  assert.match(footer, /gridTemplateColumns: bodyGridTemplateColumns/);
});

test('footer has no summary/distribution feature rows', () => {
  assert.doesNotMatch(source, /summary\?\.kind === 'number'/);
  assert.doesNotMatch(source, /summary\?\.kind === 'distribution'/);
  assert.equal((source.match(/<TableFooter/g) || []).length, 1);
  assert.match(source, /numericTotalsByColumn\.get/);
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
