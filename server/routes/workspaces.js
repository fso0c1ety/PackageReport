const express = require("express");
const { v4: uuidv4 } = require("uuid");

function defaultColumns() {
  return [
    { id: uuidv4(), name: "Text", type: "Text", order: 0 },
    { id: uuidv4(), name: "Status", type: "Status", order: 1, options: [
      { value: "Started", color: "#1976d2" },
      { value: "Working on it", color: "#fdab3d" },
      { value: "Done", color: "#00c875" },
    ] },
    { id: uuidv4(), name: "Date", type: "Date", order: 2 },
  ];
}

function inviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createWorkspacesRouter({ db, logger }) {
  const router = express.Router();

  router.get("/workspaces", async (req, res) => {
    try {
      const result = await db.query(`
        SELECT DISTINCT w.*, u.name as owner_name, u.avatar as owner_avatar,
          COALESCE((SELECT jsonb_agg(jsonb_build_object('id', um.id, 'name', um.name, 'avatar', um.avatar))
            FROM (SELECT DISTINCT (elem->>'userId') as uid FROM tables t2,
              jsonb_array_elements(CASE WHEN jsonb_typeof(COALESCE(t2.shared_users, '[]'::jsonb)) = 'array'
                THEN COALESCE(t2.shared_users, '[]'::jsonb) ELSE '[]'::jsonb END) elem
              WHERE t2.workspace_id = w.id) distinct_users
            JOIN users um ON um.id = distinct_users.uid WHERE um.id != w.owner_id), '[]'::jsonb) as members
        FROM workspaces w JOIN users u ON w.owner_id = u.id LEFT JOIN tables t ON w.id = t.workspace_id
        WHERE w.owner_id = $1 OR EXISTS (SELECT 1 FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(COALESCE(t.shared_users, '[]'::jsonb)) = 'array'
            THEN COALESCE(t.shared_users, '[]'::jsonb) ELSE '[]'::jsonb END) elem
          WHERE elem->>'userId' = $1)
      `, [req.user.id]);
      return res.json(result.rows);
    } catch (error) {
      logger.error("workspaces_fetch_failed", { userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/workspaces/:workspaceId", async (req, res) => {
    try {
      const result = await db.query(`SELECT DISTINCT w.* FROM workspaces w LEFT JOIN tables t ON w.id = t.workspace_id
        WHERE w.id = $1 AND (w.owner_id = $2 OR EXISTS
          (SELECT 1 FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(COALESCE(t.shared_users, '[]'::jsonb)) = 'array'
              THEN COALESCE(t.shared_users, '[]'::jsonb) ELSE '[]'::jsonb END
          ) elem WHERE COALESCE(elem->>'userId', elem#>>'{}') = $2))`,
      [req.params.workspaceId, req.user.id]);
      if (!result.rows[0]) return res.status(403).json({ error: "Workspace not found or forbidden" });
      return res.json(result.rows[0]);
    } catch (error) {
      logger.error("workspace_fetch_failed", { workspaceId: req.params.workspaceId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/workspaces", async (req, res) => {
    try {
      const workspace = { id: uuidv4(), name: req.body.name || "Untitled Workspace", owner_id: req.user.id };
      await db.query("INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)", [workspace.id, workspace.name, workspace.owner_id]);
      await db.query(
        "INSERT INTO tables (id, name, workspace_id, columns, created_at, invite_code) VALUES ($1, $2, $3, $4, $5, $6)",
        [uuidv4(), `${workspace.name} Table`, workspace.id, JSON.stringify(defaultColumns()), new Date().toISOString(), inviteCode()],
      );
      return res.json(workspace);
    } catch (error) {
      logger.error("workspace_create_failed", { userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.put("/workspaces/:workspaceId", async (req, res) => {
    const name = req.body.name;
    if (!name || !name.trim()) return res.status(400).json({ error: "Workspace name is required" });
    try {
      const existing = await db.query("SELECT * FROM workspaces WHERE id = $1", [req.params.workspaceId]);
      if (!existing.rows[0]) return res.status(404).json({ error: "Workspace not found" });
      if (existing.rows[0].owner_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const result = await db.query("UPDATE workspaces SET name = $1 WHERE id = $2 RETURNING *", [name.trim(), req.params.workspaceId]);
      return res.json(result.rows[0]);
    } catch (error) {
      logger.error("workspace_update_failed", { workspaceId: req.params.workspaceId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete("/workspaces/:workspaceId", async (req, res) => {
    try {
      const existing = await db.query("SELECT * FROM workspaces WHERE id = $1", [req.params.workspaceId]);
      if (!existing.rows[0]) return res.status(404).json({ error: "Workspace not found" });
      if (existing.rows[0].owner_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      await db.query("DELETE FROM workspaces WHERE id = $1", [req.params.workspaceId]);
      return res.json({ success: true });
    } catch (error) {
      logger.error("workspace_delete_failed", { workspaceId: req.params.workspaceId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete("/workspaces/:workspaceId/leave", async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM tables WHERE workspace_id = $1", [req.params.workspaceId]);
      for (const table of result.rows) {
        if (!Array.isArray(table.shared_users)) continue;
        const sharedUsers = table.shared_users.filter((user) => (typeof user === "string" ? user : user.userId) !== req.user.id);
        if (sharedUsers.length !== table.shared_users.length) {
          await db.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [JSON.stringify(sharedUsers), table.id]);
        }
      }
      return res.json({ success: true });
    } catch (error) {
      logger.error("workspace_leave_failed", { workspaceId: req.params.workspaceId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/workspaces/:workspaceId/tables", async (req, res) => {
    try {
      const existing = await db.query(`SELECT w.*,
        COALESCE(wm.workspace_role,wm.role) AS member_role
        FROM workspaces w
        LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text
        WHERE w.id=$1 LIMIT 1`, [req.params.workspaceId, req.user.id]);
      const workspace = existing.rows[0];
      if (!workspace) return res.status(404).json({ error: "Workspace not found" });
      const workspaceAdmin = workspace.owner_id === req.user.id
        || ["owner", "admin", "logistics_admin", "manager"].includes(String(workspace.member_role || "").toLowerCase());
      const result = await db.query(`SELECT t.* FROM tables t WHERE t.workspace_id = $1 AND ($2::boolean OR EXISTS
        (SELECT 1 FROM board_member_access bma WHERE bma.table_id=t.id AND bma.user_id::text=$3::text) OR EXISTS
        (SELECT 1 FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(COALESCE(t.shared_users, '[]'::jsonb)) = 'array'
            THEN COALESCE(t.shared_users, '[]'::jsonb) ELSE '[]'::jsonb END
        ) elem WHERE COALESCE(elem->>'userId', elem#>>'{}') = $3))`,
      [req.params.workspaceId, workspaceAdmin, req.user.id]);
      if (!workspaceAdmin && result.rows.length === 0) return res.status(403).json({ error: "Forbidden" });
      return res.json(result.rows);
    } catch (error) {
      logger.error("workspace_tables_fetch_failed", { workspaceId: req.params.workspaceId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/workspaces/:workspaceId/tables", async (req, res) => {
    try {
      const existing = await db.query("SELECT * FROM workspaces WHERE id = $1", [req.params.workspaceId]);
      if (!existing.rows[0] || existing.rows[0].owner_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
      const columns = Array.isArray(req.body.columns) && req.body.columns.length ? req.body.columns : defaultColumns();
      const table = {
        id: uuidv4(), name: req.body.name, workspace_id: req.params.workspaceId,
        columns, created_at: new Date().toISOString(),
      };
      await db.query(
        "INSERT INTO tables (id, name, workspace_id, columns, created_at, invite_code) VALUES ($1, $2, $3, $4, $5, $6)",
        [table.id, table.name, table.workspace_id, JSON.stringify(table.columns), table.created_at, inviteCode()],
      );
      return res.json(table);
    } catch (error) {
      logger.error("workspace_table_create_failed", { workspaceId: req.params.workspaceId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { createWorkspacesRouter, defaultColumns };
