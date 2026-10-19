const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const helper = fs.readFileSync(path.join(root, 'src/app/api/_lib/server.js'), 'utf8');
const migration009 = fs.readFileSync(path.join(root, 'server/db/migrations/009_extended_user_profiles.sql'), 'utf8');
const migration018 = fs.readFileSync(path.join(root, 'server/db/migrations/018_driver_profile_fields.sql'), 'utf8');
test('extended profile helper has no request-time DDL', () => {
  assert.doesNotMatch(helper, /ensureExtendedUserProfileColumns|ALTER\s+TABLE\s+public\.users/i);
});
test('profile columns are owned by migrations 009 and 018', () => {
  assert.match(migration009, /first_name|last_name|birth_date|gender/);
  assert.match(migration018, /driver_license|driver_license_expiry|passport/);
});
for (const relative of ['src/app/api/register/route.js','src/app/api/people/route.js','src/app/api/users/profile/route.js','src/app/api/tables/[tableId]/members/route.js']) {
  test(`${relative} does not invoke the removed schema repair helper`, () => {
    assert.doesNotMatch(fs.readFileSync(path.join(root, relative), 'utf8'), /ensureExtendedUserProfileColumns/);
  });
}
