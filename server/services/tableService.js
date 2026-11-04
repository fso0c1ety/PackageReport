const tablesRepository = require("../repositories/tablesRepository");

function normalizeAttachment(attachment) {
  if (typeof attachment === "string") {
    try {
      const parsed = JSON.parse(attachment);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return attachment && typeof attachment === "object" ? attachment : null;
}

async function getRows(tableId, table = null, userId = null, options = {}) {
  // Record-level rules must run before slicing a page. Otherwise a page can be
  // filled with hidden rows and return fewer visible records or leak ordering.
  const visibility = table && userId ? tableVisibility(table, userId) : null;
  const rows = await tablesRepository.listRows(tableId, {
    ...options,
    ...(visibility?.sqlSafe ? { visibility } : {}),
    ...(!visibility?.sqlSafe && table && userId ? { limit: undefined, offset: undefined } : {}),
  });
  if (!table || !userId) return pageRows(rows, options);
  const { rowMatchesRecordAccess } = require("./permissions");
  const visibleRows = rows.filter((row) => rowMatchesRecordAccess(row, table, userId));
  // SQL-safe visibility and pagination already happened in the repository.
  // Applying pageRows here would apply OFFSET/LIMIT twice and drop valid rows.
  return visibility?.sqlSafe ? visibleRows : pageRows(visibleRows, options);
}

function tableVisibility(table, userId) {
  const access = table.board_record_access || table.record_access || { scope: "all_permitted" };
  const scope = access.scope || "all_permitted";
  if (scope === "created_by_me") return { scope, userId: String(userId), sqlSafe: true };
  if (scope === "selected_records" && Array.isArray(access.ids)) {
    return { scope, ids: access.ids.map(String), sqlSafe: true };
  }
  return { scope, sqlSafe: false };
}

function pageRows(rows, options = {}) {
  if (options.limit === undefined && options.offset === undefined) return rows;
  const parsedLimit = Number(options.limit);
  const parsedOffset = Number(options.offset || 0);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 0 || !Number.isInteger(parsedOffset) || parsedOffset < 0) return rows;
  return rows.slice(parsedOffset, parsedOffset + Math.min(parsedLimit, 100));
}

async function getRow(tableId, rowId) {
  return tablesRepository.findRow(tableId, rowId);
}

async function getChatMessages(tableId) {
  const rows = await tablesRepository.listChatMessages(tableId);
  return rows.map((row) => ({
    ...row,
    attachment: normalizeAttachment(row.attachment),
  }));
}

module.exports = {
  getChatMessages,
  getRow,
  getRows,
  normalizeAttachment,
};
