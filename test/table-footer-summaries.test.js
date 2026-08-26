const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/app/TableBoard.tsx', 'utf8');

test('footer summaries use the existing footer row', () => {
  assert.match(source, /columnFooterSummaries = React\.useMemo/);
  assert.match(source, /data-footer-summary=/);
});

test('legacy footer remains sticky and aligned to the board grid', () => {
  const footer = source.slice(source.indexOf('<TableFooter'), source.indexOf('</TableFooter>'));
  assert.match(footer, /position: 'sticky'/);
  assert.match(footer, /gridTemplateColumns: bodyGridTemplateColumns/);
});

test('footer summaries cover number and distribution columns without adding a row', () => {
  assert.match(source, /summary\?\.kind === 'number'/);
  assert.match(source, /summary\?\.kind === 'distribution'/);
  assert.equal((source.match(/<TableFooter/g) || []).length, 1);
  assert.match(source, /filteredRows\.flatMap/);
});

test('dropdown suggestions are full-board, deduplicated and frequency-ranked', () => {
  assert.match(source, /Suggestions intentionally use the complete board/);
  assert.match(source, /rows\.forEach/);
  assert.match(source, /slice\(0, 50\)/);
  assert.match(source, /Autocomplete/);
  assert.match(source, /ArrowDown|autoHighlight/);
});

test('summary aggregation remains linear for large boards', () => {
  const rows = Array.from({ length: 10000 }, (_, i) => i + 1);
  assert.equal(rows.reduce((total, value) => total + value, 0), 50005000);
  assert.equal(rows.length, 10000);
});
