function createBoardViewRepository(db) {
  if (!db?.query) throw new Error("database query adapter is required");
  return {
    async listViews(tableId) { return (await db.query("SELECT * FROM board_views WHERE table_id = $1 ORDER BY is_default DESC, created_at ASC", [tableId])).rows; },
    async getView(id) { return (await db.query("SELECT * FROM board_views WHERE id = $1", [id])).rows[0] || null; },
    async clearDefault(tableId) { await db.query("UPDATE board_views SET is_default = FALSE, updated_at = NOW() WHERE table_id = $1", [tableId]); },
    async createView(view) {
      const result = await db.query(`INSERT INTO board_views (id, table_id, owner_id, name, type, visibility, config, is_default, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,NOW(),NOW()) RETURNING *`, [view.id, view.table_id, view.owner_id, view.name, view.type, view.visibility, JSON.stringify(view.config), view.is_default]);
      return result.rows[0];
    },
    async updateView(view) {
      const result = await db.query("UPDATE board_views SET name=$1,type=$2,visibility=$3,config=$4::jsonb,is_default=$5,updated_at=NOW() WHERE id=$6 RETURNING *", [view.name, view.type, view.visibility, JSON.stringify(view.config), view.is_default, view.id]);
      return result.rows[0] || null;
    },
    async deleteView(id) { return (await db.query("DELETE FROM board_views WHERE id=$1 RETURNING id", [id])).rowCount > 0; },
  };
}

module.exports = { createBoardViewRepository };
