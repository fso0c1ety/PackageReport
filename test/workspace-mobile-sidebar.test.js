const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'Sidebar.tsx'), 'utf8');

test('normal workspace mobile sidebar scrolls through account content', () => {
  assert.match(source, /const normalWorkspaceSidebar = !dedicatedPortal && !driverPortal/);
  assert.match(source, /overflow: normalWorkspaceSidebar \? "auto" : "hidden"/);
  assert.match(source, /height: "100dvh"/);
  assert.match(source, /bottom: 0, top: 0/);
  assert.match(source, /flex: normalWorkspaceSidebar \? "none" : 1/);
});

test('professional portal sidebar behavior remains separate', () => {
  assert.match(source, /normalWorkspaceSidebar = !dedicatedPortal && !driverPortal/);
  assert.match(source, /height: normalWorkspaceSidebar \? "auto" : "100%"/);
  assert.match(source, /overflowY: normalWorkspaceSidebar \? "visible" : "auto"/);
});
