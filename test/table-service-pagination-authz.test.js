const test = require("node:test");
const assert = require("node:assert/strict");

test("record authorization runs before pagination", async () => {
  const servicePath = require.resolve("../server/services/tableService");
  const repositoryPath = require.resolve("../server/repositories/tablesRepository");
  const originalRepository = require.cache[repositoryPath];
  require.cache[repositoryPath] = { exports: {
    listRows: async () => [
      { id: "hidden-1", created_by: "other" },
      { id: "visible-1", created_by: "user-a" },
      { id: "hidden-2", created_by: "other" },
      { id: "visible-2", created_by: "user-a" },
    ],
  } };
  delete require.cache[servicePath];
  try {
    const service = require(servicePath);
    const rows = await service.getRows(
      "table-a",
      { workspace_owner_id: "owner", board_record_access: { scope: "created_by_me" } },
      "user-a",
      { limit: 1, offset: 1 },
    );
    assert.deepEqual(rows.map((row) => row.id), ["visible-1", "visible-2"]);
  } finally {
    delete require.cache[servicePath];
    if (originalRepository) require.cache[repositoryPath] = originalRepository;
    else delete require.cache[repositoryPath];
  }
});

test("SQL-safe pagination is applied exactly once for a nonzero offset", async () => {
  const servicePath = require.resolve("../server/services/tableService");
  const repositoryPath = require.resolve("../server/repositories/tablesRepository");
  const originalRepository = require.cache[repositoryPath];
  require.cache[repositoryPath] = { exports: {
    listRows: async (_tableId, options) => {
      assert.equal(options.offset, 2);
      assert.equal(options.limit, 2);
      assert.deepEqual(options.visibility, { scope: "created_by_me", userId: "user-a", sqlSafe: true });
      return [
        { id: "visible-3", created_by: "user-a" },
        { id: "visible-4", created_by: "user-a" },
      ];
    },
  } };
  delete require.cache[servicePath];
  try {
    const rows = await require(servicePath).getRows(
      "table-a",
      { board_record_access: { scope: "created_by_me" } },
      "user-a",
      { limit: 2, offset: 2 },
    );
    assert.deepEqual(rows.map((row) => row.id), ["visible-3", "visible-4"]);
  } finally {
    delete require.cache[servicePath];
    if (originalRepository) require.cache[repositoryPath] = originalRepository;
    else delete require.cache[repositoryPath];
  }
});

test("SQL-safe empty pages remain empty without a second slice", async () => {
  const servicePath = require.resolve("../server/services/tableService");
  const repositoryPath = require.resolve("../server/repositories/tablesRepository");
  const originalRepository = require.cache[repositoryPath];
  require.cache[repositoryPath] = { exports: { listRows: async () => [] } };
  delete require.cache[servicePath];
  try {
    const rows = await require(servicePath).getRows(
      "table-a",
      { board_record_access: { scope: "selected_records", ids: ["missing"] } },
      "user-a",
      { limit: 2, offset: 4 },
    );
    assert.deepEqual(rows, []);
  } finally {
    delete require.cache[servicePath];
    if (originalRepository) require.cache[repositoryPath] = originalRepository;
    else delete require.cache[repositoryPath];
  }
});
