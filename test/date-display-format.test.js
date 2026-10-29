const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const board = fs.readFileSync('src/app/TableBoard.tsx', 'utf8');

test('board date cells use DD.MM.YYYY presentation while ISO storage remains unchanged', () => {
  assert.equal((board.match(/format\(['"]DD\.MM\.YYYY['"]\)/g) || []).length, 4);
  assert.doesNotMatch(board, /format\(['"]MMM D, YYYY['"]\)/);
  assert.match(board, /format\(['"]YYYY-MM-DD['"]\)/);
});
