const express = require("express");
const { v4: uuidv4, validate: uuidValidate } = require("uuid");

function createTaskMutationsRouter({ db, getTableAccess, logger, requireTablePermission, requireRowPermission }) {
  const router = express.Router();

  router.post("/tables/:tableId/tasks", requireTablePermission("editor"), async (req, res) => {
    try {
      const task = {
        id: uuidValidate(req.body.id) ? req.body.id : uuidv4(),
        table_id: req.params.tableId,
        values: req.body.values || {},
        created_by: req.user.id,
      };
      await db.query(
        "INSERT INTO rows (id, table_id, values, created_by, created_at) VALUES ($1, $2, $3, $4, NOW())",
        [task.id, task.table_id, JSON.stringify(task.values), task.created_by],
      );
      logger.info("table_row_created", { rowId: task.id, tableId: task.table_id, userId: task.created_by });
      return res.status(201).json(task);
    } catch (error) {
      logger.error("task_create_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.put("/tables/:tableId/doc", requireTablePermission("editor"), async (req, res) => {
    try {
      await db.query("UPDATE tables SET doc_content = $1 WHERE id = $2", [req.body.content, req.params.tableId]);
      return res.json({ success: true, content: req.body.content });
    } catch (error) {
      logger.error("table_document_update_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete("/tables/:tableId/tasks/:taskId", requireRowPermission("editor"), async (req, res) => {
    try {
      const result = await db.query("DELETE FROM rows WHERE id = $1 AND table_id = $2", [req.params.taskId, req.params.tableId]);
      if (result.rowCount === 0) return res.status(404).json({ error: "Task not found" });
      return res.json({ success: true });
    } catch (error) {
      logger.error("task_delete_failed", {
        tableId: req.params.tableId, taskId: req.params.taskId, userId: req.user.id, error: error.message,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.put("/tables/:tableId/tasks/order", requireTablePermission("editor"), async (req, res) => {
    const { orderedTaskIds } = req.body;
    if (!Array.isArray(orderedTaskIds) || orderedTaskIds.length === 0) {
      return res.status(400).json({ error: "orderedTaskIds must be a non-empty array" });
    }
    const validIds = orderedTaskIds.filter((id) => typeof id === "string" && id.trim() && id !== "placeholder");
    if (validIds.length === 0) return res.json({ success: true });
    const client = await db.pool.connect();
    try {
      const table = await getTableAccess(db, req.params.tableId, req.user.id, "editor");
      if (!table) return res.status(403).json({ error: "Access denied" });
      await client.query("BEGIN");
      await client.query(`WITH ordered AS (
        SELECT task_id, (position - 1)::int AS row_order FROM jsonb_array_elements_text($1::jsonb)
        WITH ORDINALITY AS item(task_id, position)) UPDATE rows AS row
        SET values = jsonb_set(COALESCE(row.values, '{}'::jsonb), '{order}', to_jsonb(ordered.row_order), true)
        FROM ordered WHERE row.id::text = ordered.task_id AND row.table_id = $2
        AND (row.values->>'order')::int IS DISTINCT FROM ordered.row_order`,
      [JSON.stringify(validIds), req.params.tableId]);
      await client.query("COMMIT");
      return res.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      logger.error("task_order_update_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  return router;
}

module.exports = { createTaskMutationsRouter };
