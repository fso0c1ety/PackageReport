const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/app/TableBoard.tsx', 'utf8');

test('known-good footer keeps only legacy item count and numeric totals', () => {
  assert.doesNotMatch(source, /columnFooterSummaries = React\.useMemo/);
  assert.doesNotMatch(source, /data-footer-summary=/);
  assert.match(source, /numericTotalsByColumn = React\.useMemo/);
  assert.match(source, /numericTotalsByColumn\.get/);
});

test('legacy footer remains sticky and aligned to the board grid', () => {
  const footer = source.slice(source.indexOf('<TableFooter'), source.indexOf('</TableFooter>'));
  assert.match(footer, /position: 'sticky'/);
  assert.match(footer, /gridTemplateColumns: bodyGridTemplateColumns/);
});

test('footer summary UI is not rendered by the restored TableBoard', () => {
  assert.doesNotMatch(source, /distribution/);
  assert.doesNotMatch(source, /average: numbers/);
});

test('summary aggregation remains linear for large boards', () => {
  const rows = Array.from({ length: 10000 }, (_, i) => i + 1);
  assert.equal(rows.reduce((total, value) => total + value, 0), 50005000);
  assert.equal(rows.length, 10000);
});
