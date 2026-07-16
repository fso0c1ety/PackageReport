const test = require("node:test");
const assert = require("node:assert/strict");
const { createUniversalBoardRepository } = require("../server/repositories/universalBoardRepository");

function recordingDb(rows = [{}]) {
  const calls = [];
  return {
    calls,
    async query(text, values) {
      calls.push({ text, values });
      return { rows };
    },
  };
}

test("repository parameterizes board writes and serializes structured columns", async () => {
  const db = recordingDb([{ id: "board-1" }]);
  const repository = createUniversalBoardRepository(db);
  await repository.createBoard({
    id: "board-1",
    workspace_id: "ws-1",
    name: "Projects",
    description: "",
    icon: null,
    columns: [{ id: "money", type: "money", settings: { currency: "EUR" } }],
    settings: {},
  });
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].text, /INSERT INTO tables/);
  assert.deepEqual(JSON.parse(db.calls[0].values[5])[0].settings, { currency: "EUR" });
});

test("repository scopes row reads and updates to their board", async () => {
  const db = recordingDb([{ id: "row-1", table_id: "board-1", values: {} }]);
  const repository = createUniversalBoardRepository(db);
  await repository.getRow("board-1", "row-1");
  await repository.updateRow("board-1", "row-1", { title: "Task", group_id: null, assigned_user_ids: [], values: {} });
  assert.deepEqual(db.calls[0].values, ["row-1", "board-1"]);
  assert.deepEqual(db.calls[1].values.slice(-2), ["row-1", "board-1"]);
});

test("archive uses soft delete and returns the archived row", async () => {
  const db = recordingDb([{ id: "row-1", archived_at: "now" }]);
  const repository = createUniversalBoardRepository(db);
  const archived = await repository.archiveRow("board-1", "row-1");
  assert.equal(archived.id, "row-1");
  assert.match(db.calls[0].text, /archived_at = NOW\(\)/);
});
