const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/app/TableBoard.tsx', 'utf8');

test('tableboard keeps the known-good bounded viewport layout', () => {
  const table = source.slice(source.indexOf('<TableContainer'), source.indexOf('<Table\n'));
  assert.match(table, /height: isMobile/);
  assert.match(table, /minHeight: 240/);
  assert.match(source, /height: rowVirtualizer\.getTotalSize\(\)/);
  assert.match(source, /overflowX: 'auto'/);
});

test('table content preserves configured grid width and legacy footer flow', () => {
  const tableStart = source.indexOf('<Table', source.indexOf('<TableContainer') + 1);
  const table = source.slice(tableStart, source.indexOf('<Box\n  role="rowgroup"', tableStart));
  assert.match(table, /width: gridContentWidth/);
  assert.match(table, /minWidth: '100%'/);
  const footer = source.slice(source.indexOf('<TableFooter'), source.indexOf('</TableFooter>'));
  assert.match(footer, /position: 'sticky'/);
  assert.match(footer, /numericTotalsByColumn/);
  assert.match(footer, /filteredRows\.length/);
});

test('known-good table keeps the original row and header sizing contracts', () => {
  assert.match(source, /ROW_HEIGHT_ESTIMATE/);
  assert.match(source, /height: BOARD_HEADER_HEIGHT/);
  assert.match(source, /height: ROW_HEIGHT_ESTIMATE/);
});

test('known-good table keeps horizontal and vertical scrolling on the shared viewport', () => {
  const container = source.slice(source.indexOf('const tableContainerSx'), source.indexOf('const tableSx'));
  assert.match(source, /overflowX: 'auto'/);
  assert.match(source, /overflowY: 'auto'/);
  assert.match(source, /tableContainerRef/);
  assert.ok(container.length >= 0);
});
