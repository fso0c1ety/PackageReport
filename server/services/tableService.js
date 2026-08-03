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

async function getRows(tableId, table = null, userId = null) {
  const rows = await tablesRepository.listRows(tableId);
  if (!table || !userId) return rows;
  const { rowMatchesRecordAccess } = require("./permissions");
  return rows.filter((row) => rowMatchesRecordAccess(row, table, userId));
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
