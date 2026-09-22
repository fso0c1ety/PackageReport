const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (...parts) => fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");

test("task mutations publish committed realtime row payloads", () => {
  const collection = read("src", "app", "api", "tables", "[tableId]", "tasks", "route.js");
  const item = read("src", "app", "api", "tables", "[tableId]", "tasks", "[taskId]", "route.js");
  const cell = read("src", "app", "api", "tables", "[tableId]", "tasks", "[taskId]", "cells", "[columnId]", "route.js");

  assert.match(collection, /broadcastTableInvalidation\(tableId, "INSERT", \{ row: createdRow \}\)/);
  assert.match(collection, /broadcastTableInvalidation\(tableId, "UPDATE", \{ row: updatedRow \}\)/);
  assert.match(item, /broadcastTableInvalidation\(tableId, "DELETE", \{ rowId: taskId \}\)/);
  assert.match(cell, /broadcastTableInvalidation\(tableId, "UPDATE", \{[\s\S]*row: result\.rows\[0\]/);
});

test("TableBoard applies realtime payloads directly and keeps polling as compatibility fallback", () => {
  const source = read("src", "app", "TableBoard.tsx");

  assert.match(source, /eventType === 'DELETE'[\s\S]*current\.filter\(\(row\) => row\.id !== payload\.rowId\)/);
  assert.match(source, /const realtimeRow = normalizeRealtimeRow\(payload\?\.row\)/);
  assert.match(source, /sortRowsForRealtime\(existing/);
  assert.match(source, /Compatibility for older mutation paths/);
  assert.match(source, /setInterval\(\(\) => \{ void pollRowsFallback\(\); \}, 15000\)/);
});
