const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/notification-preferences/route.js'), 'utf8');
const migration = fs.readFileSync(path.join(process.cwd(), 'server/db/migrations/034_notification_preferences.sql'), 'utf8');

test('notification preferences route does not execute runtime DDL', () => {
  assert.doesNotMatch(route, /CREATE\s+TABLE|ALTER\s+TABLE|CREATE\s+(?:UNIQUE\s+)?INDEX/i);
});

test('notification_preferences schema is owned by migration 034', () => {
  assert.match(migration, /ALTER\s+TABLE\s+users/i);
  assert.match(migration, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+notification_preferences\s+JSONB/i);
});

test('route retains authenticated user scoping for reads and writes', () => {
  assert.match(route, /getAuthenticatedUser\(req\)/);
  assert.match(route, /WHERE id=\$1/);
  assert.match(route, /WHERE id=\$2/);
});
