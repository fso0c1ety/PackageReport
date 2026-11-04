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

const ROW_PROJECTION = `id, table_id, values, created_by, created_at, updated_at,
      group_id, title, position, assigned_user_ids, archived_at`;

function normalizePageOption(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

async function listRows(tableId, options = {}) {
  const limit = normalizePageOption(options.limit, null);
  const offset = normalizePageOption(options.offset, 0);
  const values = [tableId];
  let visibility = "";
  if (options.visibility?.scope === "created_by_me" && options.visibility.userId) {
    values.push(String(options.visibility.userId));
    visibility = " AND created_by = $2";
  } else if (options.visibility?.scope === "selected_records" && Array.isArray(options.visibility.ids)) {
    values.push(options.visibility.ids.map(String));
    visibility = ` AND id = ANY($${values.length}::text[])`;
  }
  let pagination = "";
  if (limit !== null) {
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;
    values.push(Math.min(limit, 100), offset);
    pagination = ` LIMIT $${limitParam} OFFSET $${offsetParam}`;
  }
  const result = await db.query(
    `SELECT ${ROW_PROJECTION}
      FROM rows
      WHERE table_id = $1${visibility}
      ORDER BY (values->>'order')::int ASC NULLS FIRST, created_at DESC
      ${pagination}`,
    values
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
