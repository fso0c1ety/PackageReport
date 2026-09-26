const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const tasks = fs.readFileSync('src/app/api/tables/[tableId]/tasks/route.js', 'utf8');

test('task create and update acknowledge the committed row before secondary delivery', () => {
  const post = tasks.slice(tasks.indexOf('export async function POST('), tasks.indexOf('export async function PUT('));
  const put = tasks.slice(tasks.indexOf('export async function PUT('));

  assert.ok(post.indexOf('const createdRow = insertRes.rows[0]') < post.indexOf('after(async () =>'));
  assert.match(post, /after\(async \(\) => \{[\s\S]*runAutomations/);
  assert.doesNotMatch(post.slice(0, post.indexOf('const createdRow = insertRes.rows[0]')), /await runAutomations/);

  assert.ok(put.indexOf('const updatedRow = updateRes.rows[0]') < put.indexOf('after(async () =>'));
  assert.match(put, /after\(async \(\) => \{[\s\S]*maybeSendTaskNotifications/);
  assert.match(put, /after\(async \(\) => \{[\s\S]*sendTableNotification/);
  assert.match(put, /after\(async \(\) => \{[\s\S]*runAutomations/);
  assert.doesNotMatch(put.slice(0, put.indexOf('const updatedRow = updateRes.rows[0]')), /await maybeSendTaskNotifications|await sendTableNotification|await runAutomations/);
});

test('role context is shared for brief same-role navigation without changing API authorization', () => {
  for (const file of ['src/app/ClientLayout.tsx', 'src/app/Sidebar.tsx']) {
    const source = fs.readFileSync(file, 'utf8');
    const contextRead = source.slice(source.indexOf('portal-context'), source.indexOf('portal-context') + 300);
    assert.match(contextRead, /responseCacheTtlMs: 15_000/);
  }
});

test('home defers non-critical activity updates until the browser is idle', () => {
  const home = fs.readFileSync('src/app/(dashboard)/home/HomeDashboard.tsx', 'utf8');
  const initialLoad = home.slice(home.indexOf('// Workspaces make up the initial Home shell.'), home.indexOf('// Poll for updates'));
  assert.match(initialLoad, /fetchWorkspaces\(\)/);
  assert.match(initialLoad, /requestIdleCallback/);
  assert.match(initialLoad, /fetchUpdates\(\)/);
  assert.match(home, /cancelIdleCallback\(initialUpdatesHandle\)/);
});

test('notification realtime setup reuses its deterministic user topic across navigation', () => {
  const topBar = fs.readFileSync('src/app/TopBar.tsx', 'utf8');
  const setupRealtime = topBar.slice(topBar.indexOf('const setupRealtime = async () =>'), topBar.indexOf('void setupRealtime()', topBar.indexOf('const setupRealtime = async () =>')));
  assert.match(setupRealtime, /getApiUrl\("notifications\/realtime-topic"\)/);
  assert.match(setupRealtime, /responseCacheTtlMs:\s*60_000/);
  assert.match(setupRealtime, /supabase\s*\.channel\(topic/);
});
