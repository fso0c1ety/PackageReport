const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const files = [
  'src/app/api/billing/overview/route.js',
  'src/app/api/billing/portal/route.js',
  'src/app/api/billing/confirm/route.js',
  'src/app/api/billing/checkout/route.js',
  'server/routes/billing.js',
];

test('billing server paths accept Stripe secret and restricted server keys', () => {
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /\(\?:sk\|rk\)_\(\?:test\|live\)_/);
  }
});
