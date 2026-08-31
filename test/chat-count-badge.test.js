const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'TableBoard.tsx'), 'utf8');

test('row discussion badge uses persisted message totals and stays hidden when empty', () => {
  assert.match(source, /badgeContent=\{Array\.isArray\(row\.values\?\.message\)/);
  assert.match(source, /invisible=\{!Array\.isArray\(row\.values\?\.message\) \|\| row\.values\.message\.length === 0\}/);
  assert.match(source, /row\.values\.message\.length > 99 \? '99\+'/);
});

test('chat badge remains attached to the existing icon action', () => {
  assert.match(source, /onClick=\{e => handleOpenChat\(e, row\.id, row\.values\.message \|\| \[\], 'message'\)\}/);
  assert.match(source, /<Badge[\s\S]*?<ChatBubbleOutlineIcon sx=\{\{ fontSize: 18 \}\} \/>/);
});
