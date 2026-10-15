const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

test('credentialed CORS never uses wildcard origin', () => {
  const nextConfig = read('next.config.ts');
  const proxy = read('src/proxy.ts');
  const electron = read('electron/main.js');
  assert.doesNotMatch(nextConfig, /Access-Control-Allow-Origin.*\*/);
  assert.doesNotMatch(proxy, /Access-Control-Allow-Origin.*\*/);
  assert.match(proxy, /Access-Control-Allow-Credentials.*true/);
  assert.match(electron, /Access-Control-Allow-Origin.*app:\/\/localhost/);
});

test('Electron requests use the app protocol proxy before cross-origin fetch', () => {
  const apiUrl = read('src/app/apiUrl.ts');
  assert.match(apiUrl, /const firstRequestUrl = canUseElectronProxyFallback/);
  assert.match(apiUrl, /fetch\(firstRequestUrl/);
});

test('driver route treats web and static Electron paths identically', () => {
  const layout = read('src/app/ClientLayout.tsx');
  assert.match(layout, /replace\(\/\\\.html\$\/i, ""\)/);
  assert.match(layout, /normalizedPathname === "\/driver-trips"/);
  assert.doesNotMatch(layout, /driver-trips\.html.*redirect/);
});

test('portal load failure has retry and login recovery actions', () => {
  const layout = read('src/app/ClientLayout.tsx');
  assert.match(layout, /Nuk mund të ngarkohej portali/);
  assert.match(layout, /window\.location\.reload\(\)/);
  assert.match(layout, /redirectToAppRoute\('\/login', true\)/);
});
