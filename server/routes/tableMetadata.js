const express = require("express");

function createTableMetadataRouter({ db, logger, requireTablePermission, requireWorkspacePermission }) {
  const router = express.Router();

  router.patch("/tables/:tableId", requireTablePermission("editor"), async (req, res) => {
    try {
      if (typeof req.body.name !== "string") return res.status(400).json({ error: "Missing or invalid name" });
      await db.query("UPDATE tables SET name = $1 WHERE id = $2", [req.body.name, req.params.tableId]);
      return res.json({ success: true, name: req.body.name });
    } catch (error) {
      logger.error("table_patch_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete("/tables/:tableId", requireTablePermission("owner"), async (req, res) => {
    try {
      await db.query("DELETE FROM tables WHERE id = $1", [req.params.tableId]);
      return res.json({ success: true });
    } catch (error) {
      logger.error("table_delete_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.put("/tables/:tableId/columns", requireTablePermission("admin"), async (req, res) => {
    try {
      await db.query("UPDATE tables SET columns = $1 WHERE id = $2", [JSON.stringify(req.body.columns), req.params.tableId]);
      return res.json({ success: true, columns: req.body.columns });
    } catch (error) {
      logger.error("table_columns_update_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/tables", async (req, res) => {
    try {
      if (req.query.workspaceId) {
        const workspaceResult = await db.query("SELECT * FROM workspaces WHERE id = $1", [req.query.workspaceId]);
        const workspace = workspaceResult.rows[0];
        if (!workspace) return res.status(404).json({ error: "Workspace not found" });
        const result = await db.query(`SELECT t.*, COALESCE(json_agg(json_build_object(
          'id', r.id, 'table_id', r.table_id, 'values', r.values, 'created_by', r.created_by,
          'created_at', r.created_at, 'creator', CASE WHEN creator.id IS NULL THEN NULL ELSE json_build_object(
            'id', creator.id, 'name', creator.name, 'email', creator.email, 'avatar', creator.avatar) END
          )) FILTER (WHERE r.id IS NOT NULL), '[]') as tasks
          FROM tables t LEFT JOIN rows r ON t.id = r.table_id LEFT JOIN users creator ON creator.id = r.created_by
          WHERE t.workspace_id = $1 AND ($2 = $3 OR EXISTS
            (SELECT 1 FROM jsonb_array_elements(t.shared_users) elem WHERE elem->>'userId' = $3)) GROUP BY t.id`,
        [req.query.workspaceId, workspace.owner_id, req.user.id]);
        return res.json(result.rows);
      }
      const result = await db.query(`SELECT t.*, COALESCE(json_agg(json_build_object(
        'id', r.id, 'table_id', r.table_id, 'values', r.values, 'created_by', r.created_by,
        'created_at', r.created_at, 'creator', CASE WHEN creator.id IS NULL THEN NULL ELSE json_build_object(
          'id', creator.id, 'name', creator.name, 'email', creator.email, 'avatar', creator.avatar) END
        )) FILTER (WHERE r.id IS NOT NULL), '[]') as tasks
        FROM tables t JOIN workspaces w ON t.workspace_id = w.id LEFT JOIN rows r ON t.id = r.table_id
        LEFT JOIN users creator ON creator.id = r.created_by
        WHERE w.owner_id = $1 OR t.shared_users @> $2::jsonb GROUP BY t.id`,
      [req.user.id, JSON.stringify([{ userId: req.user.id }])]);
      return res.json(result.rows);
    } catch (error) {
      logger.error("tables_fetch_failed", { workspaceId: req.query.workspaceId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/tables/:tableId", async (req, res) => {
    try {
      const result = await db.query(`SELECT t.*, w.owner_id as workspace_owner_id, w.name as workspace_name
        FROM tables t JOIN workspaces w ON t.workspace_id = w.id WHERE t.id = $1 AND
        (w.owner_id = $2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) elem WHERE elem->>'userId' = $2))`,
      [req.params.tableId, req.user.id]);
      if (!result.rows[0]) return res.status(404).json({ error: "Table not found or forbidden" });
      return res.json(result.rows[0]);
    } catch (error) {
      logger.error("table_fetch_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { createTableMetadataRouter };
