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

async function getRows(tableId) {
  return tablesRepository.listRows(tableId);
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
