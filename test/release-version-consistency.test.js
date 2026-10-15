const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

test('Web and lockfile share one valid release version', () => {
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
});

test('Windows Driver consumes canonical package version without changing app identity', () => {
  assert.equal(pkg.build.appId, 'com.packagereport.desktop');
  assert.equal(pkg.build.productName, 'Smart Manage');
  assert.equal(pkg.build.win.artifactName, 'Smart-Manage-Setup-${version}.${ext}');
  const main = fs.readFileSync(path.join(root, 'electron/main.js'), 'utf8');
  assert.match(main, /app\.getVersion\(\)/);
});

test('Android keeps its canonical versionName and separately controlled versionCode', () => {
  const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
  assert.match(gradle, /canonicalVersionName = packageMetadata\.version/);
  assert.match(gradle, /versionCode canonicalVersionCode/);
  assert(Number.isSafeInteger(pkg.smartManage.androidVersionCode));
});
