const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'app', 'api', 'workspaces', '[workspaceId]', 'modules', 'route.js'),
  'utf8'
);

test('workspace module schema discovery is coalesced and cached per runtime isolate', () => {
  assert.match(source, /let modulesStorageShapePromise/);
  assert.match(source, /if \(!modulesStorageShapePromise\)/);
  assert.match(source, /modulesStorageShapePromise = pool/);
  assert.match(source, /modulesStorageShapePromise = undefined/);
});

test('workspace module authorization result reuses the owner lookup', () => {
  assert.match(source, /return \{ authorized: true, isOwner: true \}/);
  assert.match(source, /canManage: authorization\.isOwner/);
  assert.doesNotMatch(source, /const owner = await pool\.query/);
});
