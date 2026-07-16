const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeBoard, normalizeColumn, normalizeRow } = require("../server/services/universalBoardAdapter");

test("legacy AGS table maps to a generic board without losing columns", () => {
  const board = normalizeBoard({
    id: "ags",
    workspace_id: "workspace-1",
    name: "Aximo Studio",
    columns: JSON.stringify([{ key: "nui", name: "NUI", type: "text" }]),
  });
  assert.equal(board.title, "Aximo Studio");
  assert.equal(board.columns[0].key, "nui");
  assert.equal(board.columns[0].type, "text");
});

test("legacy row values stay available as structured values", () => {
  const row = normalizeRow({
    id: "row-1",
    table_id: "ags",
    values: JSON.stringify({ NUI: "811292177", order: 3 }),
  });
  assert.equal(row.values.NUI, "811292177");
  assert.equal(row.position, 3);
  assert.equal(row.archived, false);
});

test("generic column defaults are deterministic", () => {
  assert.deepEqual(normalizeColumn({ name: "Email", type: "email" }, 2), {
    id: "column_2",
    key: "column_2",
    name: "Email",
    type: "email",
    position: 2,
    width: 180,
    required: false,
    settings: {},
  });
});
