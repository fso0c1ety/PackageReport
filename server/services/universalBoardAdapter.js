function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeColumn(column, index = 0) {
  const key = column.key || column.id || `column_${index}`;
  return {
    id: column.id || key,
    key,
    name: column.name || column.title || key,
    type: column.type || "text",
    position: Number.isFinite(column.position) ? column.position : index,
    width: Number.isFinite(column.width) ? column.width : 180,
    hidden: Boolean(column.hidden),
    frozen: Boolean(column.frozen || column.fixed),
    required: Boolean(column.required),
    defaultValue: column.defaultValue ?? null,
    settings: parseJson(column.settings || column.config, {}),
  };
}

function normalizeBoard(table) {
  const legacyColumns = parseJson(table.columns, []);
  return {
    id: table.id,
    workspaceId: table.workspace_id,
    title: table.name || table.title || "Untitled board",
    description: table.description || "",
    icon: table.icon || null,
    archived: Boolean(table.archived_at),
    defaultViewId: table.default_view_id || null,
    settings: parseJson(table.settings, {}),
    columns: Array.isArray(legacyColumns) ? legacyColumns.map(normalizeColumn) : [],
  };
}

function normalizeRow(row) {
  const values = parseJson(row.values, {});
  return {
    id: row.id,
    boardId: row.table_id,
    groupId: row.group_id || null,
    title: row.title || values.name || values.title || "",
    position: Number(row.position ?? values.order ?? 0),
    createdBy: row.created_by || null,
    assignedUserIds: parseJson(row.assigned_user_ids, []),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    archived: Boolean(row.archived_at),
    values,
  };
}

module.exports = { normalizeBoard, normalizeColumn, normalizeRow, parseJson };
