const { randomUUID } = require("crypto");

const VIEW_TYPES = Object.freeze(["table", "kanban", "calendar", "map", "chart", "timeline", "gallery", "form", "dashboard"]);
const VISIBILITY = Object.freeze(["private", "workspace", "public"]);

function normalizeView(input, actor, idFactory = randomUUID) {
  const type = String(input?.type || "table").toLowerCase();
  if (!VIEW_TYPES.includes(type)) throw new Error(`Unsupported view type: ${type}`);
  const visibility = String(input?.visibility || "workspace").toLowerCase();
  if (!VISIBILITY.includes(visibility)) throw new Error(`Unsupported visibility: ${visibility}`);
  const name = String(input?.name || "").trim();
  const tableId = String(input?.tableId || input?.table_id || "").trim();
  if (!name) throw new Error("name is required");
  if (!tableId) throw new Error("tableId is required");
  return {
    id: input?.id || idFactory(),
    table_id: tableId,
    owner_id: input?.ownerId || input?.owner_id || actor?.id || null,
    name,
    type,
    visibility,
    config: input?.config && typeof input.config === "object" && !Array.isArray(input.config) ? structuredClone(input.config) : {},
    is_default: Boolean(input?.isDefault ?? input?.is_default),
  };
}

function createBoardViewService(repository, idFactory = randomUUID) {
  if (!repository) throw new Error("repository is required");
  return {
    async list(tableId, actor) {
      const views = await repository.listViews(tableId);
      return views.filter((view) => view.visibility !== "private" || view.owner_id === actor?.id);
    },
    async create(input, actor) {
      const view = normalizeView(input, actor, idFactory);
      if (view.is_default) await repository.clearDefault(view.table_id);
      return repository.createView(view);
    },
    async update(id, patch, actor) {
      const existing = await repository.getView(id);
      if (!existing) throw new Error("View not found");
      if (existing.visibility === "private" && existing.owner_id !== actor?.id) throw new Error("View permission denied");
      const view = normalizeView({ ...existing, ...patch, id, tableId: existing.table_id }, actor, idFactory);
      if (view.is_default) await repository.clearDefault(view.table_id);
      return repository.updateView(view);
    },
    async duplicate(id, actor) {
      const existing = await repository.getView(id);
      if (!existing) throw new Error("View not found");
      return repository.createView(normalizeView({ ...existing, id: idFactory(), name: `${existing.name} (copy)`, isDefault: false, tableId: existing.table_id, ownerId: actor?.id }, actor, idFactory));
    },
    async remove(id, actor) {
      const existing = await repository.getView(id);
      if (!existing) return false;
      if (existing.owner_id && existing.owner_id !== actor?.id && !actor?.isAdmin) throw new Error("View permission denied");
      return repository.deleteView(id);
    },
  };
}

module.exports = { VIEW_TYPES, VISIBILITY, createBoardViewService, normalizeView };
