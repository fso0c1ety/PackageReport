const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workspace = fs.readFileSync('src/app/(dashboard)/workspace/page.tsx', 'utf8');
const board = fs.readFileSync('src/app/TableBoard.tsx', 'utf8');

test('workspace warms board metadata and first rows before a tab click', () => {
  assert.match(workspace, /const prefetchTable = \(tableId: string\)/);
  assert.match(workspace, /onMouseEnter=\{\(\) => prefetchTable\(table\.id\)\}/);
  assert.ok(workspace.includes('tasks?limit=100&offset=0'));
});

test('TableBoard consumes warmed responses without changing pagination', () => {
  assert.match(board, /consumeCachedResponse: true/);
  assert.ok(board.includes('tasks?limit=100&offset=0'));
  assert.ok(board.includes('tasks?limit=500&offset=${offset}'));
});
