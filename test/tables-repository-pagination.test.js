const test = require("node:test");
const assert = require("node:assert/strict");

test("listRows uses a bounded page and explicit row projection when requested", async () => {
  const calls = [];
  const repositoryPath = require.resolve("../server/repositories/tablesRepository");
  const dbPath = require.resolve("../server/db");
  const originalDb = require.cache[dbPath];
  require.cache[dbPath] = { exports: { query: async (...args) => {
    calls.push(args);
    return { rows: [{ id: "row-1", table_id: "table-1" }] };
  } } };
  delete require.cache[repositoryPath];
  try {
    const repository = require(repositoryPath);
    const rows = await repository.listRows("table-1", { limit: 250, offset: 20 });
    assert.deepEqual(rows, [{ id: "row-1", table_id: "table-1" }]);
    assert.equal(calls.length, 1);
    assert.match(calls[0][0], /SELECT id, table_id, values, created_by/);
    assert.match(calls[0][0], /LIMIT \$2 OFFSET \$3/);
    assert.deepEqual(calls[0][1], ["table-1", 100, 20]);
    assert.doesNotMatch(calls[0][0], /SELECT \* FROM rows/);
  } finally {
    delete require.cache[repositoryPath];
    if (originalDb) require.cache[dbPath] = originalDb;
    else delete require.cache[dbPath];
  }
});

test("listRows preserves the existing unpaged call when no page is requested", async () => {
  const calls = [];
  const repositoryPath = require.resolve("../server/repositories/tablesRepository");
  const dbPath = require.resolve("../server/db");
  const originalDb = require.cache[dbPath];
  require.cache[dbPath] = { exports: { query: async (...args) => {
    calls.push(args);
    return { rows: [] };
  } } };
  delete require.cache[repositoryPath];
  try {
    await require(repositoryPath).listRows("table-1");
    assert.deepEqual(calls[0][1], ["table-1"]);
    assert.doesNotMatch(calls[0][0], /LIMIT/);
  } finally {
    delete require.cache[repositoryPath];
    if (originalDb) require.cache[dbPath] = originalDb;
    else delete require.cache[dbPath];
  }
});

test("listRows parameterizes SQL-safe created-by visibility before pagination", async () => {
  const calls = [];
  const repositoryPath = require.resolve("../server/repositories/tablesRepository");
  const dbPath = require.resolve("../server/db");
  const originalDb = require.cache[dbPath];
  require.cache[dbPath] = { exports: { query: async (...args) => {
    calls.push(args);
    return { rows: [] };
  } } };
  delete require.cache[repositoryPath];
  try {
    await require(repositoryPath).listRows("table-1", {
      limit: 10,
      offset: 20,
      visibility: { scope: "created_by_me", userId: "user' OR 1=1 --" },
    });
    assert.match(calls[0][0], /created_by = \$2/);
    assert.match(calls[0][0], /LIMIT \$3 OFFSET \$4/);
    assert.deepEqual(calls[0][1], ["table-1", "user' OR 1=1 --", 10, 20]);
  } finally {
    delete require.cache[repositoryPath];
    if (originalDb) require.cache[dbPath] = originalDb;
    else delete require.cache[dbPath];
  }
});

test("unsupported record rules do not reach the SQL visibility shortcut", async () => {
  const calls = [];
  const repositoryPath = require.resolve("../server/repositories/tablesRepository");
  const dbPath = require.resolve("../server/db");
  const originalDb = require.cache[dbPath];
  require.cache[dbPath] = { exports: { query: async (...args) => {
    calls.push(args);
    return { rows: [] };
  } } };
  delete require.cache[repositoryPath];
  try {
    await require(repositoryPath).listRows("table-1", {
      limit: 10,
      visibility: { scope: "custom", userId: "user-a" },
    });
    assert.doesNotMatch(calls[0][0], /created_by =/);
    assert.deepEqual(calls[0][1], ["table-1", 10, 0]);
  } finally {
    delete require.cache[repositoryPath];
    if (originalDb) require.cache[dbPath] = originalDb;
    else delete require.cache[dbPath];
  }
});
