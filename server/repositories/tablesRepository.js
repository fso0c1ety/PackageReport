const db = require("../db");

async function findById(tableId) {
  const result = await db.query(
    `
      SELECT
        t.*,
        w.owner_id AS workspace_owner_id
      FROM tables t
      LEFT JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.id = $1
    `,
    [tableId]
  );
  return result.rows[0] || null;
}

async function listRows(tableId) {
  const result = await db.query(
    "SELECT * FROM rows WHERE table_id = $1 ORDER BY (values->>'order')::int ASC NULLS FIRST, created_at DESC",
    [tableId]
  );
  return result.rows;
}

async function findRow(tableId, rowId) {
  const result = await db.query("SELECT * FROM rows WHERE id = $1 AND table_id = $2", [rowId, tableId]);
  return result.rows[0] || null;
}

async function listChatMessages(tableId) {
  const result = await db.query(
    `
      SELECT tc.*, u.avatar as sender_avatar
      FROM table_chats tc
      LEFT JOIN users u ON tc.sender_id = u.id
      WHERE tc.table_id = $1
      ORDER BY tc.timestamp ASC
    `,
    [tableId]
  );
  return result.rows;
}

module.exports = {
  findById,
  findRow,
  listChatMessages,
  listRows,
};
