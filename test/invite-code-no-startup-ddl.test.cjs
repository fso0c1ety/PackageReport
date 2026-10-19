const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(process.cwd(), 'server/server.js'), 'utf8');
const migration = fs.readFileSync(path.join(process.cwd(), 'server/db/migrations/001_core_saas_schema.sql'), 'utf8');

test('startup no longer alters tables for invite_code', () => {
  assert.doesNotMatch(source, /ALTER\s+TABLE\s+tables\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+invite_code/i);
});

test('invite_code is owned by the core migration', () => {
  assert.match(migration, /invite_code\s+TEXT/i);
});

test('legacy backfill remains data-only and scoped to missing invite codes', () => {
  assert.match(source, /SELECT id FROM tables WHERE invite_code IS NULL/);
  assert.match(source, /UPDATE tables SET invite_code = \$1 WHERE id = \$2/);
});
