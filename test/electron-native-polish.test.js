const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = require('node:path').resolve(__dirname, '..');
const main = fs.readFileSync(require('node:path').join(root, 'electron/main.js'), 'utf8');
const login = fs.readFileSync(require('node:path').join(root, 'src/app/(auth)/login/page.tsx'), 'utf8');

test('Electron uses the native Smart Manage splash and stable updater', () => {
  assert.match(main, /Preparing your workspace/);
  assert.match(main, /One workspace\. Zero chaos\./);
  assert.doesNotMatch(main, /Manage your business with clarity|Loading your workspace/);
  assert.match(main, /provider:\s*"github"/);
  assert.match(main, /owner:\s*"fso0c1ety"/);
  assert.match(main, /repo:\s*"PackageReport"/);
  assert.match(main, /updaterDownloadPromise/);
  assert.match(main, /Update download timed out/);
});

test('Electron login is separated from the public web header', () => {
  assert.match(login, /isElectronRuntime/);
  assert.match(login, /!electronRuntime/);
});
