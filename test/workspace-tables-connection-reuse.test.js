import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routePath = new URL("../src/app/api/workspaces/[workspaceId]/tables/route.js", import.meta.url);
const routeSource = fs.readFileSync(routePath, "utf8");

test("workspace tables GET reuses one client for both reads and releases it", () => {
  assert.match(routeSource, /client\s*=\s*await pool\.connect\(\)/);
  assert.match(routeSource, /client\.query\("SELECT \* FROM workspaces WHERE id = \$1"/);
  assert.match(routeSource, /const tablesResult = await client\.query\(/);
  assert.match(routeSource, /finally\s*\{\s*client\?\.release\(\);/s);
  assert.doesNotMatch(routeSource, /const tablesResult = await pool\.query\(/);
});

test("workspace tables GET keeps the existing two-read ordering", () => {
  const workspaceRead = routeSource.indexOf('client.query("SELECT * FROM workspaces WHERE id = $1"');
  const tablesRead = routeSource.indexOf("const tablesResult = await client.query(");
  assert.ok(workspaceRead >= 0 && tablesRead > workspaceRead);
  assert.match(routeSource, /Workspace not found/);
  assert.match(routeSource, /Internal server error/);
});
