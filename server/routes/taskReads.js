const express = require("express");

function createTaskReadsRouter({ logger, requireTablePermission, tableService }) {
  const router = express.Router();

  router.get("/tables/:tableId/tasks", requireTablePermission("viewer"), async (req, res) => {
    try {
      return res.json(await tableService.getRows(req.params.tableId));
    } catch (error) {
      logger.error("tasks_fetch_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/tables/:tableId/tasks/:taskId", requireTablePermission("viewer"), async (req, res) => {
    try {
      const row = await tableService.getRow(req.params.tableId, req.params.taskId);
      if (!row) return res.status(404).json({ error: "Task not found" });
      return res.json(row);
    } catch (error) {
      logger.error("task_fetch_failed", {
        tableId: req.params.tableId,
        taskId: req.params.taskId,
        userId: req.user.id,
        error: error.message,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { createTaskReadsRouter };
