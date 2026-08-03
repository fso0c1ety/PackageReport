const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
test("Phase 4 cell edits use a granular authorized endpoint", () => {
  const board = readFileSync(join(root, "src", "app", "TableBoard.tsx"), "utf8");
  const route = readFileSync(join(root, "src", "app", "api", "tables", "[tableId]", "tasks", "[taskId]", "cells", "[columnId]", "route.js"), "utf8");
  assert.match(board, /tasks\/\$\{rowId\}\/cells\/\$\{colId\}/);
  assert.match(board, /method: "PATCH"/);
  assert.doesNotMatch(board.slice(board.indexOf("tasks/${rowId}/cells/${colId}"), board.indexOf("tasks/${rowId}/cells/${colId}") + 500), /values: latestRow\.values/);
  assert.match(route, /requireRowPermission/);
  assert.match(route, /Column not found/);
  assert.match(route, /clientVersion/);
});
