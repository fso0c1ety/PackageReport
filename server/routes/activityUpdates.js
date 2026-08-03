const express = require("express");

function parseColumns(columns) {
  if (Array.isArray(columns)) return columns;
  try {
    return JSON.parse(columns || "[]");
  } catch {
    return [];
  }
}

function createActivityUpdatesRouter({ db, logger, normalizeActivityHtml }) {
  const router = express.Router();

  router.get("/email-updates", async (req, res) => {
    try {
      const workspaces = await db.query("SELECT id FROM workspaces WHERE owner_id = $1", [req.user.id]);
      const workspaceIds = workspaces.rows.map((workspace) => workspace.id);
      if (!workspaceIds.length) return res.json([]);
      const tables = await db.query("SELECT id FROM tables WHERE workspace_id = ANY($1)", [workspaceIds]);
      const tableIds = tables.rows.map((table) => table.id);
      if (!tableIds.length) return res.json([]);
      const logs = await db.query(`SELECT activity_logs.*, tables.columns AS table_columns
        FROM activity_logs LEFT JOIN tables ON tables.id = activity_logs.table_id
        WHERE activity_logs.table_id = ANY($1) ORDER BY activity_logs.timestamp DESC LIMIT 20`, [tableIds]);
      return res.json(logs.rows.map((log) => ({
        id: log.id,
        recipients: log.recipients,
        subject: log.subject,
        html: normalizeActivityHtml(log.html, parseColumns(log.table_columns)),
        timestamp: log.timestamp,
        tableId: log.table_id,
        taskId: log.task_id,
        status: log.status,
        errorMessage: log.error_message,
        error_message: log.error_message,
      })));
    } catch (error) {
      logger.error("activity_updates_fetch_failed", { userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { createActivityUpdatesRouter, parseColumns };
