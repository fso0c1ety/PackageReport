const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const billing = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'api', '_lib', 'billing.js'), 'utf8');
const workspaceRoute = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'api', 'workspaces', '[workspaceId]', 'route.js'), 'utf8');
const home = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'home', 'HomeDashboard.tsx'), 'utf8');

test('billing cleanup excludes demo workspaces and no-op table rows', () => {
  assert.equal((billing.match(/w\.is_demo IS NOT TRUE/g) || []).length, 3);
  assert.equal((billing.match(/t\.billing_archived_at IS NOT NULL OR t\.billing_purge_at IS NOT NULL/g) || []).length, 3);
  assert.match(billing, /UPDATE tables AS t[\s\S]+FROM workspaces AS w/);
});

test('workspace deletion is owner-only and does not require an active subscription', () => {
  const deleteBody = workspaceRoute.slice(workspaceRoute.indexOf('export async function DELETE'));
  assert.doesNotMatch(deleteBody, /requireWritableSubscription/);
  assert.match(deleteBody, /String\(workspace\.owner_id\) !== String\(user\.id\)/);
  assert.match(deleteBody, /DELETE FROM workspaces WHERE id = \$1/);
});

test('workspace deletion UI preserves failed workspaces and exposes status errors', () => {
  assert.match(home, /const workspaceId = String\(selectedWorkspace\.id\)/);
  assert.match(home, /setWorkspaces\(prev => prev\.filter\(w => String\(w\.id\) !== workspaceId\)\)/);
  assert.match(home, /401:|403:|404:|500:/);
  assert.match(home, /setIsDeletingWorkspace\(true\)/);
  assert.match(home, /<Alert severity="error"/);
});
