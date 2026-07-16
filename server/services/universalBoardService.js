const { randomUUID } = require("crypto");
const { normalizeBoard, normalizeColumn, normalizeRow } = require("./universalBoardAdapter");

function requiredText(value, field) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function structuredObject(value, field) {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value;
}

function createUniversalBoardService(repository, idFactory = randomUUID) {
  if (!repository) throw new Error("repository is required");

  return {
    async createBoard(input, actor) {
      const columns = Array.isArray(input?.columns)
        ? input.columns.map((column, index) => normalizeColumn(column, index))
        : [];
      const board = {
        id: idFactory(),
        workspace_id: requiredText(input?.workspaceId, "workspaceId"),
        name: requiredText(input?.title, "title"),
        description: input?.description?.trim?.() || "",
        icon: input?.icon || null,
        columns,
        settings: structuredObject(input?.settings, "settings"),
        created_by: actor?.id || null,
      };
      return normalizeBoard(await repository.createBoard(board));
    },

    async createColumn(boardId, input) {
      const existing = await repository.getBoard(boardId);
      if (!existing) throw new Error("Board not found");
      const columns = Array.isArray(existing.columns) ? existing.columns : [];
      const column = normalizeColumn({ ...input, id: input?.id || idFactory() }, columns.length);
      column.name = requiredText(input?.name, "name");
      const saved = await repository.saveColumns(boardId, [...columns, column]);
      return normalizeColumn(saved.at(-1), saved.length - 1);
    },

    async createRow(boardId, input, actor) {
      if (!(await repository.getBoard(boardId))) throw new Error("Board not found");
      const row = {
        id: idFactory(),
        table_id: boardId,
        group_id: input?.groupId || null,
        title: input?.title?.trim?.() || "",
        position: Number.isFinite(input?.position) ? input.position : 0,
        assigned_user_ids: Array.isArray(input?.assignedUserIds) ? input.assignedUserIds : [],
        values: structuredObject(input?.values, "values"),
        created_by: actor?.id || null,
      };
      return normalizeRow(await repository.createRow(row));
    },

    async updateRow(boardId, rowId, patch) {
      const existing = await repository.getRow(boardId, rowId);
      if (!existing) throw new Error("Row not found");
      const values = patch?.values === undefined
        ? existing.values
        : { ...structuredObject(existing.values, "existing values"), ...structuredObject(patch.values, "values") };
      return normalizeRow(await repository.updateRow(boardId, rowId, {
        title: patch?.title === undefined ? existing.title : String(patch.title).trim(),
        group_id: patch?.groupId === undefined ? existing.group_id : patch.groupId,
        assigned_user_ids: patch?.assignedUserIds === undefined ? existing.assigned_user_ids : patch.assignedUserIds,
        values,
      }));
    },

    async archiveRow(boardId, rowId) {
      if (!(await repository.getRow(boardId, rowId))) throw new Error("Row not found");
      return normalizeRow(await repository.archiveRow(boardId, rowId));
    },
  };
}

module.exports = { createUniversalBoardService, requiredText, structuredObject };
