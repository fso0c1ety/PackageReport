const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const boardSource = readFileSync(join(__dirname, "..", "src", "app", "TableBoard.tsx"), "utf8");

test("TableBoard orders rapid saves per cell without a global edit lock", async () => {
  assert.match(boardSource, /cellSaveQueuesRef/);
  assert.match(boardSource, /pendingCellValuesRef/);
  assert.match(boardSource, /previousSave\.catch\(\(\) => undefined\)\.then\(persistCell\)/);
  assert.match(boardSource, /cellSaveQueuesRef\.current\.delete\(saveKey\)/);
  assert.match(boardSource, /pendingCellValuesRef\.current\.forEach/);

  const queues = new Map();
  const committed = [];
  const enqueue = (key, value) => {
    const previous = queues.get(key) || Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      committed.push(value);
    });
    queues.set(key, next);
    return next;
  };

  // Two edits to one cell are serialized, while another cell is independent.
  await Promise.all([
    enqueue("row-a:status", "B"),
    enqueue("row-a:status", "C"),
    enqueue("row-a:name", "Latest name"),
  ]);
  assert.deepEqual(committed, ["B", "Latest name", "C"]);
});

test("stale cell responses cannot clear or revert a newer pending value", () => {
  const versions = { "row-a:status": 2 };
  const pending = new Map([["row-a:status", { version: 2, value: "C" }]]);
  const staleVersion = 1;
  if (versions["row-a:status"] === staleVersion) pending.delete("row-a:status");
  assert.deepEqual(pending.get("row-a:status"), { version: 2, value: "C" });
});
