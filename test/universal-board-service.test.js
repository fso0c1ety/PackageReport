const test = require("node:test");
const assert = require("node:assert/strict");
const { createUniversalBoardService } = require("../server/services/universalBoardService");

function fakeRepository() {
  const boards = new Map();
  const rows = new Map();
  return {
    boards,
    rows,
    async createBoard(board) { boards.set(board.id, board); return board; },
    async getBoard(id) { return boards.get(id) || null; },
    async saveColumns(id, columns) { boards.get(id).columns = columns; return columns; },
    async createRow(row) { rows.set(row.id, row); return row; },
    async getRow(boardId, rowId) { const row = rows.get(rowId); return row?.table_id === boardId ? row : null; },
    async updateRow(boardId, rowId, patch) { const row = { ...rows.get(rowId), ...patch }; rows.set(rowId, row); return row; },
    async archiveRow(boardId, rowId) { const row = { ...rows.get(rowId), archived_at: "2026-07-16T00:00:00Z" }; rows.set(rowId, row); return row; },
  };
}

test("blank workspace creates a generic board and column", async () => {
  const repository = fakeRepository();
  let sequence = 0;
  const service = createUniversalBoardService(repository, () => `id-${++sequence}`);
  const board = await service.createBoard({ workspaceId: "ws-1", title: "Projects" }, { id: "owner" });
  const column = await service.createColumn(board.id, { name: "Budget", type: "money", settings: { currency: "EUR" } });
  assert.equal(board.title, "Projects");
  assert.equal(column.type, "money");
  assert.equal(column.settings.currency, "EUR");
});

test("generic rows preserve structured values and merge updates", async () => {
  const repository = fakeRepository();
  let sequence = 0;
  const service = createUniversalBoardService(repository, () => `id-${++sequence}`);
  const board = await service.createBoard({ workspaceId: "ws-1", title: "Invoices" }, { id: "owner" });
  const created = await service.createRow(board.id, { title: "INV-1", values: { money: { amount: 100, currency: "EUR" } } }, { id: "owner" });
  const updated = await service.updateRow(board.id, created.id, { values: { paid: true } });
  assert.deepEqual(updated.values.money, { amount: 100, currency: "EUR" });
  assert.equal(updated.values.paid, true);
});

test("row archive is soft and keeps cell data", async () => {
  const repository = fakeRepository();
  let sequence = 0;
  const service = createUniversalBoardService(repository, () => `id-${++sequence}`);
  const board = await service.createBoard({ workspaceId: "ws-1", title: "Tasks" }, { id: "owner" });
  const row = await service.createRow(board.id, { values: { status: "Done" } }, { id: "owner" });
  const archived = await service.archiveRow(board.id, row.id);
  assert.equal(archived.archived, true);
  assert.equal(archived.values.status, "Done");
});

test("service rejects invalid unstructured cell payloads", async () => {
  const repository = fakeRepository();
  const service = createUniversalBoardService(repository, () => "id");
  const board = await service.createBoard({ workspaceId: "ws-1", title: "Tasks" }, { id: "owner" });
  await assert.rejects(() => service.createRow(board.id, { values: "display text" }, { id: "owner" }), /values must be an object/);
});
