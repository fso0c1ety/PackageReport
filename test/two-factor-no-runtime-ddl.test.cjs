const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const route = fs.readFileSync(path.join(root, 'src/app/api/users/two-factor/route.js'), 'utf8');
const helper = fs.readFileSync(path.join(root, 'src/app/api/_lib/twoFactor.js'), 'utf8');
const migration017 = fs.readFileSync(path.join(root, 'server/db/migrations/017_optional_two_factor.sql'), 'utf8');
const migration047 = fs.readFileSync(path.join(root, 'server/db/migrations/047_two_factor_otp_challenges.sql'), 'utf8');

test('two-factor request paths contain no runtime DDL', () => {
  assert.doesNotMatch(route, /CREATE\s+TABLE|ALTER\s+TABLE|CREATE\s+(?:UNIQUE\s+)?INDEX/i);
  assert.doesNotMatch(helper, /CREATE\s+TABLE|ALTER\s+TABLE|CREATE\s+(?:UNIQUE\s+)?INDEX/i);
});

test('migration ownership is explicit and additive', () => {
  assert.match(migration017, /two_factor_enabled\s+BOOLEAN/i);
  assert.match(migration047, /CREATE TABLE IF NOT EXISTS auth_otp_challenges/i);
  assert.match(migration047, /idx_auth_otp_user_created/i);
  assert.match(migration047, /REFERENCES users\(id\) ON DELETE CASCADE/i);
});

test('OTP security invariants remain in application code', () => {
  assert.match(helper, /MAX_ATTEMPTS = 5/);
  assert.match(helper, /OTP_TTL_MINUTES = 10/);
  assert.match(helper, /consumed_at=NOW\(\)/);
  assert.match(helper, /timingSafeEqual/);
  assert.match(helper, /attempts >= MAX_ATTEMPTS/);
});
