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
