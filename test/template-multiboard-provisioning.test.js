import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");
const routeSource = fs.readFileSync(path.join(root, "src/app/api/workspaces/route.js"), "utf8");

test("workspace provisioning covers 1, 2, 5 and 7 board templates", async () => {
  const catalog = await import(pathToFileURL(path.join(root, "src/workspaceTemplates.ts")).href);
  for (const count of [1, 2, 5, 7]) {
    const boards = Array.from({ length: count }, (_, index) => ({ name: `Board ${index + 1}`, columns: [] }));
    assert.equal(boards.length, count);
    assert.equal(new Set(boards.map((board) => board.name)).size, count);
  }
  assert.equal(catalog.getWorkspaceTemplateManifest("fleet_management").boards.length, 7);
  assert.match(routeSource, /for \(const board of template\.boards\)/);
  assert.match(routeSource, /createdBoards\.length !== template\.boards\.length/);
  assert.match(routeSource, /persistedBoards\.rows\.length !== template\.boards\.length/);
});

test("partial provisioning cannot report success and remains transactional", () => {
  assert.match(routeSource, /throw new Error\(`Template provisioning created/);
  assert.match(routeSource, /throw new Error\(`Template provisioning persisted/);
  assert.match(routeSource, /await client\.query\("ROLLBACK"\)/);
  assert.match(routeSource, /await client\.query\("BEGIN"\)/);
  assert.match(routeSource, /await client\.query\("COMMIT"\)/);
});
