const express = require("express");

const TEAMMATE_PERMISSIONS = new Set(["read", "edit", "admin"]);

function createTeammatesRouter({ db, logger }) {
  const router = express.Router();

  router.get("/teammates", async (req, res) => {
    try {
      const result = await db.query(`WITH owned_tables AS (
        SELECT t.id, t.name table_name, t.shared_users, w.name workspace_name FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id WHERE w.owner_id = $1),
      all_collaborators AS (
        SELECT elem->>'userId' user_id, 'joined' status, ot.id table_id, ot.table_name,
          ot.workspace_name, elem->>'permission' permission FROM owned_tables ot
          CROSS JOIN LATERAL jsonb_array_elements(ot.shared_users) elem
        UNION ALL SELECT n.recipient_id::text user_id, 'pending' status, NULL table_id,
          NULL table_name, NULL workspace_name, 'edit' permission FROM notifications n
          WHERE n.sender_id = $1 AND n.type = 'invite'),
      unique_collaborators AS (
        SELECT user_id, MIN(status) status, jsonb_agg(jsonb_build_object(
          'tableId', table_id, 'tableName', table_name, 'workspaceName', workspace_name,
          'permission', permission)) FILTER (WHERE table_id IS NOT NULL) access
        FROM all_collaborators WHERE user_id != $1::text GROUP BY user_id)
      SELECT u.id, u.name, u.email, u.avatar, uc.status, uc.access FROM users u
      JOIN unique_collaborators uc ON u.id::text = uc.user_id`, [req.user.id]);
      return res.json(result.rows.map((user) => ({
        ...user,
        avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true`,
      })));
    } catch (error) {
      logger.error("teammates_fetch_failed", { userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete("/teammates/:teammateId", async (req, res) => {
    try {
      const tables = await db.query(`SELECT t.id, t.shared_users FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id WHERE w.owner_id = $1`, [req.user.id]);
      for (const table of tables.rows) {
        if (!Array.isArray(table.shared_users)) continue;
        const sharedUsers = table.shared_users.filter((user) => user.userId !== req.params.teammateId);
        if (sharedUsers.length !== table.shared_users.length) {
          await db.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [JSON.stringify(sharedUsers), table.id]);
        }
      }
      await db.query("DELETE FROM notifications WHERE sender_id = $1 AND recipient_id = $2 AND type = 'invite'", [req.user.id, req.params.teammateId]);
      return res.json({ success: true });
    } catch (error) {
      logger.error("teammate_remove_failed", { userId: req.user.id, teammateId: req.params.teammateId, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.put("/teammates/:teammateId/permission", async (req, res) => {
    const { permission } = req.body;
    if (!TEAMMATE_PERMISSIONS.has(permission)) return res.status(400).json({ error: "Invalid permission" });
    try {
      const tables = await db.query(`SELECT t.id, t.shared_users FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id WHERE w.owner_id = $1`, [req.user.id]);
      for (const table of tables.rows) {
        if (!Array.isArray(table.shared_users)) continue;
        let modified = false;
        const sharedUsers = table.shared_users.map((user) => {
          if (user.userId !== req.params.teammateId) return user;
          modified = true;
          return { ...user, permission };
        });
        if (modified) await db.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [JSON.stringify(sharedUsers), table.id]);
      }
      return res.json({ success: true });
    } catch (error) {
      logger.error("teammate_permission_update_failed", { userId: req.user.id, teammateId: req.params.teammateId, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.put("/tables/:tableId/teammates/:teammateId/permission", async (req, res) => {
    const { permission } = req.body;
    if (!TEAMMATE_PERMISSIONS.has(permission)) return res.status(400).json({ error: "Invalid permission" });
    try {
      const result = await db.query(`SELECT t.id, t.shared_users FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id WHERE t.id = $1 AND w.owner_id = $2`,
      [req.params.tableId, req.user.id]);
      if (!result.rows.length) return res.status(403).json({ error: "Forbidden" });
      const table = result.rows[0];
      if (Array.isArray(table.shared_users)) {
        const sharedUsers = table.shared_users.map((user) => user.userId === req.params.teammateId ? { ...user, permission } : user);
        await db.query("UPDATE tables SET shared_users = $1::jsonb WHERE id = $2", [JSON.stringify(sharedUsers), table.id]);
      }
      return res.json({ success: true });
    } catch (error) {
      logger.error("table_teammate_permission_update_failed", {
        tableId: req.params.tableId, userId: req.user.id, teammateId: req.params.teammateId, error: error.message,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { createTeammatesRouter, TEAMMATE_PERMISSIONS };
