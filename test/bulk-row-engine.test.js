const test = require("node:test");
const assert = require("node:assert/strict");
const { bulkArchive, bulkUpdate, createHistory, duplicateRows, moveRowsToGroup, selectedRows } = require("../server/services/bulkRowEngine");

const rows = [
  { id: "1", title: "First", group_id: "a", values: { status: "Working", owner: "u1" } },
  { id: "2", title: "Second", group_id: "a", values: { status: "Working", owner: "u2" } },
  { id: "3", title: "Third", group_id: "b", values: { status: "Done", owner: "u1" } },
];

test("bulk selection and edits affect only selected rows", () => {
  assert.deepEqual(selectedRows(rows, ["1", "3"]).map((row) => row.id), ["1", "3"]);
  const updated = bulkUpdate(rows, ["1", "2"], { values: { status: "Done" } });
  assert.deepEqual(updated.map((row) => row.values.status), ["Done", "Done", "Done"]);
  assert.equal(updated[0].values.owner, "u1");
});

test("bulk archive, restore, group move and duplicate preserve values", () => {
  const archived = bulkArchive(rows, ["2"]);
  assert.equal(archived[1].archived, true);
  assert.equal(bulkArchive(archived, ["2"], false)[1].archived, false);
  assert.equal(moveRowsToGroup(rows, ["1", "3"], "new")[2].group_id, "new");
  const duplicated = duplicateRows(rows, ["1"], () => "copy-1");
  assert.equal(duplicated.at(-1).id, "copy-1");
  assert.equal(duplicated.at(-1).values.status, "Working");
});

test("history supports bounded undo and redo", () => {
  const history = createHistory(2);
  history.push(rows);
  const changed = bulkUpdate(rows, ["1"], { values: { status: "Done" } });
  assert.equal(history.undo(changed)[0].values.status, "Working");
  assert.equal(history.state().canRedo, true);
  assert.equal(history.redo(rows)[0].values.status, "Done");
});
