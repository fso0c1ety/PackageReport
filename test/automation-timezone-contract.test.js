const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const route = fs.readFileSync('src/app/api/automation/due/route.js', 'utf8');

test('date-only automation scheduling uses workspace IANA timezone with Kosovo-compatible fallback', () => {
  assert.match(route, /w\.settings->>'timezone'/);
  assert.match(route, /pg_timezone_names/);
  assert.match(route, /Europe\/Belgrade/);
  assert.match(route, /make_timestamptz/);
  assert.doesNotMatch(route, /scheduled_at::date=CURRENT_DATE/);
});

test('date-only scheduling retains idempotency and bounded retry window', () => {
  assert.match(route, /ON CONFLICT \(idempotency_key\) DO UPDATE SET/);
  assert.match(route, /scheduled_at>=NOW\(\)-INTERVAL '24 hours'/);
});
