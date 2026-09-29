import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const tableBoard = fs.readFileSync(
  path.join(process.cwd(), 'src', 'app', 'TableBoard.tsx'),
  'utf8',
);

test('Board Views constrains the MUI Menu list and keeps its header sticky', () => {
  const menuStart = tableBoard.indexOf('onClose={() => setHeaderMenuAnchor(null)}');
  const menuEnd = tableBoard.indexOf("setWorkspaceView('table')", menuStart);
  assert.ok(menuStart >= 0, 'Board Views menu should exist');
  assert.ok(menuEnd > menuStart, 'Board Views menu should contain its first item');

  const menu = tableBoard.slice(menuStart, menuEnd);
  assert.match(menu, /slotProps=\{\{\s*list:\s*\{\s*sx:/s);
  assert.match(menu, /maxHeight:\s*210/);
  assert.match(menu, /overflowY:\s*'auto'/);
  assert.match(menu, /overflowX:\s*'hidden'/);
  assert.match(menu, /p:\s*0/);

  const headerStart = tableBoard.indexOf('<Box sx={{ px: 2, py: 1.5', menuStart);
  const headerEnd = tableBoard.indexOf('Board Views', headerStart);
  const header = tableBoard.slice(headerStart, headerEnd);
  assert.match(header, /position:\s*'sticky'/);
  assert.match(header, /top:\s*0/);
});
