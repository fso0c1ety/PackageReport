const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/app/TableBoard.tsx', 'utf8');

test('table footer stays in flow below the virtualized body', () => {
  const footer = source.slice(source.indexOf('<TableFooter'), source.indexOf('</TableFooter>'));
  assert.match(footer, /position: 'relative'/);
  assert.doesNotMatch(footer, /position: 'sticky'/);
  assert.match(footer, /gridTemplateColumns: bodyGridTemplateColumns/);
  assert.match(footer, /minHeight: ROW_HEIGHT_ESTIMATE/);
});

test('footer cells contain summaries without horizontal overflow', () => {
  const footer = source.slice(source.indexOf('<TableFooter'), source.indexOf('</TableFooter>'));
  assert.match(footer, /overflow: 'hidden'/);
  assert.match(footer, /boxSizing: 'border-box'/);
  assert.match(footer, /data-footer-summary=/);
});

test('table viewport is bounded independently from virtual content size', () => {
  const table = source.slice(source.indexOf('<TableContainer'), source.indexOf('<Table\n'));
  assert.match(table, /filteredRowIds\.length <= 12/);
  assert.match(table, /display: 'flex'/);
  assert.match(table, /flexDirection: 'column'/);
  assert.match(table, /minHeight: 0/);
  assert.match(source, /height: rowVirtualizer\.getTotalSize\(\)/);
  assert.match(source, /overflowX: 'auto'/);
});

test('table content width cannot shrink inside the flex viewport', () => {
  const tableStart = source.indexOf('<Table', source.indexOf('<TableContainer') + 1);
  const table = source.slice(tableStart, source.indexOf('<Box\n  role="rowgroup"', tableStart));
  assert.match(table, /width: gridContentWidth/);
  assert.match(table, /minWidth: gridContentWidth/);
  assert.match(table, /flex: '0 0 auto'/);
  assert.match(table, /flexShrink: 0/);
});
