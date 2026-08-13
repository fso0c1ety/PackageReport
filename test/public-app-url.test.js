const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolvePublicAppUrl } = require('../server/config/publicAppUrl');

test('production transactional links use trusted HTTPS and never localhost', () => {
  const env = { NODE_ENV: 'production', PUBLIC_APP_URL: 'https://package-report.vercel.app/' };
  const base = resolvePublicAppUrl({ env, requestUrl: 'http://localhost:3000' });
  assert.equal(base, 'https://package-report.vercel.app');
  for (const path of ['activate-account', 'reset-password', 'verify-email', 'workspace']) {
    const link = `${base}/${path}?token=test`;
    assert.match(link, /^https:\/\//);
    assert.doesNotMatch(link, /localhost|127\.0\.0\.1/i);
  }
});

test('production rejects localhost and missing trusted public URLs', () => {
  assert.throws(() => resolvePublicAppUrl({ env: { NODE_ENV: 'production', PUBLIC_APP_URL: 'http://localhost:3000' } }), /HTTPS.*localhost/i);
  assert.throws(() => resolvePublicAppUrl({ env: { NODE_ENV: 'production' }, requestUrl: 'https://attacker.example' }), /trusted production public app URL/i);
});

test('development may use localhost or its request origin', () => {
  assert.equal(resolvePublicAppUrl({ env: { NODE_ENV: 'development' } }), 'http://localhost:3000');
  assert.equal(resolvePublicAppUrl({ env: { NODE_ENV: 'development' }, requestUrl: 'http://localhost:4000/api/register' }), 'http://localhost:4000');
});

test('demo, activation, verification and password reset use the shared resolver', () => {
  const read = (...parts) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
  assert.match(read('src', 'app', 'api', '_lib', 'demoProvisioning.js'), /publicAppUrl\(req\).*activate-account/s);
  assert.match(read('src', 'app', 'api', '_lib', 'accountTokens.js'), /resolvePublicAppUrl/);
  assert.match(read('src', 'app', 'api', 'forgot-password', 'route.js'), /const appUrl = publicAppUrl\(req\)/);
  assert.match(read('server', 'routes', 'auth.js'), /resolvePublicAppUrl/);
});
