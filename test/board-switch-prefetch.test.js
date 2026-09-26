const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workspace = fs.readFileSync('src/app/(dashboard)/workspace/page.tsx', 'utf8');
const board = fs.readFileSync('src/app/TableBoard.tsx', 'utf8');

test('workspace warms board metadata and first rows before a tab click', () => {
  assert.match(workspace, /const prefetchTable = \(tableId: string\)/);
  assert.match(workspace, /onMouseEnter=\{\(\) => prefetchTable\(table\.id\)\}/);
  assert.ok(workspace.includes('tasks?limit=100&offset=0'));
});

test('workspace coalesces repeated hover/focus prefetches per board', () => {
  assert.match(workspace, /prefetchesRef = useRef\(new Map<string, Promise<void>>\(\)\)/);
  assert.match(workspace, /const existing = prefetchesRef\.current\.get\(tableId\)/);
  assert.match(workspace, /if \(existing\) return/);
  assert.match(workspace, /prefetchesRef\.current\.set\(tableId, request\)/);
});

test('TableBoard consumes warmed responses without changing pagination', () => {
  assert.match(board, /consumeCachedResponse: true/);
  assert.ok(board.includes('tasks?limit=100&offset=0'));
  assert.ok(board.includes('tasks?limit=500&offset=${offset}'));
});

test('People selector merges authoritative current-workspace teammates', () => {
  const people = fs.readFileSync('src/app/PeopleSelector.tsx', 'utf8');
  assert.match(people, /getApiUrl\('\/teammates'\)/);
  assert.match(people, /membership\.workspaceId/);
  assert.match(people, /entry\.workspaceId/);
});

test('shell profile consumers share a brief authenticated response cache', () => {
  for (const file of ['src/app/TopBar.tsx', 'src/app/Sidebar.tsx', 'src/app/TableBoard.tsx']) {
    const source = fs.readFileSync(file, 'utf8');
    const profileRead = source.slice(source.indexOf('users/profile'), source.indexOf('users/profile') + 220);
    assert.match(profileRead, /responseCacheTtlMs: 60_000/);
  }
});

test('sidebar startup checks reuse their existing polling windows across navigation remounts', () => {
  const sidebar = fs.readFileSync('src/app/Sidebar.tsx', 'utf8');
  const platformAccess = sidebar.slice(sidebar.indexOf('internal/platform-access'), sidebar.indexOf('internal/platform-access') + 220);
  const calendarReminders = sidebar.slice(sidebar.indexOf('calendar-events/reminders'), sidebar.indexOf('calendar-events/reminders') + 240);
  const maintenanceReminders = sidebar.slice(sidebar.indexOf('maintenance/reminders'), sidebar.indexOf('maintenance/reminders') + 260);

  assert.match(platformAccess, /responseCacheTtlMs: 60_000/);
  assert.match(calendarReminders, /responseCacheTtlMs: 30_000/);
  assert.match(maintenanceReminders, /responseCacheTtlMs: 5 \* 60_000/);
});

test('desktop navigation does not load mobile-only portal context', () => {
  const mobileNavigation = fs.readFileSync('src/app/MobileBottomNavigation.tsx', 'utf8');
  assert.match(mobileNavigation, /const isMobile = useMediaQuery/);
  assert.match(mobileNavigation, /if \(!isMobile\) \{\s*setPortalContext\(null\);\s*return;/);
  assert.match(mobileNavigation, /if \(!isMobile \|\| !dedicatedPortal\) return null/);
});
