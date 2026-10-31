const test = require("node:test");
const assert = require("node:assert/strict");
const { PAGE_SIZE, hasNextTaskPage, mergeTaskPage, normalizeTaskPage, taskPageRequest } = require("../src/app/todoListPaging");

test("5,000-task traversal is demand-driven in 100-row pages", () => {
  assert.equal(PAGE_SIZE, 100);
  assert.equal(taskPageRequest("board/tenant-a", 0), "/tables/board%2Ftenant-a/tasks?limit=100&offset=0");
  assert.equal(taskPageRequest("board/tenant-a", 49), "/tables/board%2Ftenant-a/tasks?limit=100&offset=4900");
  assert.equal(hasNextTaskPage(Array.from({ length: 100 })), true);
  assert.equal(hasNextTaskPage(Array.from({ length: 99 })), false);
});

test("page normalization keeps response envelopes and tenant data separate", () => {
  const tenantA = [{ id: "a-1", workspace_id: "tenant-a" }];
  const tenantB = [{ id: "b-1", workspace_id: "tenant-b" }];
  assert.deepEqual(normalizeTaskPage(tenantA), tenantA);
  assert.deepEqual(normalizeTaskPage({ rows: tenantB }), tenantB);
  assert.notDeepEqual(normalizeTaskPage({ rows: tenantB }), tenantA);
  assert.deepEqual(normalizeTaskPage({ rows: null }), []);
});

test("continuous loading appends pages without duplicates or manual page controls", () => {
  const first = Array.from({ length: 100 }, (_, index) => ({ id: `task-${index}` }));
  const second = Array.from({ length: 100 }, (_, index) => ({ id: `task-${index + 100}` }));
  const merged = mergeTaskPage(mergeTaskPage([], first, 0), second, 1);
  assert.equal(merged.length, 200);
  assert.equal(new Set(merged.map((row) => row.id)).size, 200);
  assert.equal(hasNextTaskPage(first), true);
  assert.equal(hasNextTaskPage(second.slice(0, 99)), false);
});
