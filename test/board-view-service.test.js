const test = require("node:test");
const assert = require("node:assert/strict");
const { VIEW_TYPES, createBoardViewService, normalizeView } = require("../server/services/boardViewService");

function repository() {
  const views = new Map();
  return {
    views,
    async listViews(tableId) { return [...views.values()].filter((view) => view.table_id === tableId); },
    async getView(id) { return views.get(id) || null; },
    async clearDefault(tableId) { for (const view of views.values()) if (view.table_id === tableId) view.is_default = false; },
    async createView(view) { views.set(view.id, structuredClone(view)); return views.get(view.id); },
    async updateView(view) { views.set(view.id, structuredClone(view)); return views.get(view.id); },
    async deleteView(id) { return views.delete(id); },
  };
}

test("all professional board view types are supported", () => {
  assert.deepEqual(VIEW_TYPES, ["table", "kanban", "calendar", "map", "chart", "timeline", "gallery", "form", "dashboard"]);
  for (const type of VIEW_TYPES) assert.equal(normalizeView({ tableId: "b", name: type, type }, { id: "u" }, () => type).type, type);
});

test("views save shared configuration and enforce private visibility", async () => {
  const repo = repository(); const service = createBoardViewService(repo, (() => { let i = 0; return () => `v${++i}`; })());
  await service.create({ tableId: "b1", name: "My tasks", type: "table", visibility: "private", config: { filters: [{ columnId: "owner", operator: "current_user" }], sorting: [], grouping: null } }, { id: "u1" });
  await service.create({ tableId: "b1", name: "Team Kanban", type: "kanban", isDefault: true }, { id: "u2" });
  assert.equal((await service.list("b1", { id: "u2" })).length, 1);
  assert.equal((await service.list("b1", { id: "u1" })).length, 2);
});

test("default and duplicate view behavior remains deterministic", async () => {
  const repo = repository(); const service = createBoardViewService(repo, (() => { let i = 0; return () => `v${++i}`; })());
  const table = await service.create({ tableId: "b1", name: "Table", type: "table", isDefault: true }, { id: "u1" });
  const calendar = await service.create({ tableId: "b1", name: "Calendar", type: "calendar", isDefault: true }, { id: "u1" });
  assert.equal(repo.views.get(table.id).is_default, false);
  assert.equal(repo.views.get(calendar.id).is_default, true);
  const copy = await service.duplicate(calendar.id, { id: "u2" });
  assert.equal(copy.name, "Calendar (copy)");
  assert.equal(copy.owner_id, "u2");
  assert.equal(copy.is_default, false);
});
