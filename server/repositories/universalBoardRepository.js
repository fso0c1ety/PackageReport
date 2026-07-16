function createUniversalBoardRepository(db) {
  if (!db?.query) throw new Error("database query adapter is required");

  return {
    async createBoard(board) {
      const result = await db.query(
        `INSERT INTO tables
          (id, workspace_id, name, description, icon, columns, settings, created_at, shared_users)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, '[]'::jsonb)
         RETURNING *`,
        [
          board.id,
          board.workspace_id,
          board.name,
          board.description,
          board.icon,
          JSON.stringify(board.columns),
          JSON.stringify(board.settings),
          Date.now(),
        ],
      );
      return result.rows[0];
    },

    async getBoard(boardId) {
      const result = await db.query("SELECT * FROM tables WHERE id = $1 AND archived_at IS NULL", [boardId]);
      return result.rows[0] || null;
    },

    async saveColumns(boardId, columns) {
      const result = await db.query(
        "UPDATE tables SET columns = $1::jsonb WHERE id = $2 RETURNING columns",
        [JSON.stringify(columns), boardId],
      );
      return result.rows[0]?.columns || [];
    },

    async createRow(row) {
      const result = await db.query(
        `INSERT INTO rows
          (id, table_id, group_id, title, position, assigned_user_ids, values, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, NOW(), NOW())
         RETURNING *`,
        [
          row.id,
          row.table_id,
          row.group_id,
          row.title,
          row.position,
          JSON.stringify(row.assigned_user_ids),
          JSON.stringify(row.values),
          row.created_by,
        ],
      );
      return result.rows[0];
    },

    async getRow(boardId, rowId) {
      const result = await db.query(
        "SELECT * FROM rows WHERE id = $1 AND table_id = $2 AND archived_at IS NULL",
        [rowId, boardId],
      );
      return result.rows[0] || null;
    },

    async updateRow(boardId, rowId, patch) {
      const result = await db.query(
        `UPDATE rows
         SET title = $1, group_id = $2, assigned_user_ids = $3::jsonb,
             values = $4::jsonb, updated_at = NOW()
         WHERE id = $5 AND table_id = $6 AND archived_at IS NULL
         RETURNING *`,
        [
          patch.title,
          patch.group_id,
          JSON.stringify(patch.assigned_user_ids || []),
          JSON.stringify(patch.values || {}),
          rowId,
          boardId,
        ],
      );
      return result.rows[0] || null;
    },

    async archiveRow(boardId, rowId) {
      const result = await db.query(
        "UPDATE rows SET archived_at = NOW(), updated_at = NOW() WHERE id = $1 AND table_id = $2 RETURNING *",
        [rowId, boardId],
      );
      return result.rows[0] || null;
    },
  };
}

module.exports = { createUniversalBoardRepository };
