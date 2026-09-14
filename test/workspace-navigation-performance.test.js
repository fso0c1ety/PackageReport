const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const apiSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'apiUrl.ts'), 'utf8');
const sidebarSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'Sidebar.tsx'), 'utf8');
const workspaceSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'workspace', 'page.tsx'), 'utf8');
const homeSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'home', 'HomeDashboard.tsx'), 'utf8');

test('workspace module reads reuse a bounded authenticated response cache', () => {
  assert.match(apiSource, /responseCacheTtlMs\?: number/);
  assert.match(apiSource, /cachedGetResponses/);
  assert.match(apiSource, /responseCacheTtlMs > 0 && response\.ok/);
  assert.match(apiSource, /key\.startsWith\(`\$\{requestUrl\}\|`\)/);
  assert.match(sidebarSource, /modules`\), \{ suppressNativeErrorAlert: true, responseCacheTtlMs: 60_000 \}/);
  assert.match(workspaceSource, /modules`\), \{ suppressNativeErrorAlert: true, responseCacheTtlMs: 60_000 \}/);
});

test('the recent workspace route is prefetched without changing navigation UI', () => {
  assert.match(homeSource, /router\.prefetch\(getAppHref\(`\/workspace\?id=\$\{lastWorkspace\.id\}`\)\)/);
});
