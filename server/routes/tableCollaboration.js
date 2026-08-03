const express = require("express");
const { v4: uuidv4 } = require("uuid");

function createTableCollaborationRouter({ db, io, logger, requireTablePermission, sendPushNotification, tableService }) {
  const router = express.Router();

  async function createInviteNotification(recipientId, senderId, tableId, tableName, permission) {
    const notificationId = uuidv4();
    await db.query(
      "INSERT INTO notifications (id, recipient_id, sender_id, type, data) VALUES ($1, $2, $3, $4, $5)",
      [notificationId, recipientId, senderId, "invite", JSON.stringify({ tableId, tableName, permission })],
    );
    const user = await db.query("SELECT fcm_token FROM users WHERE id = $1", [recipientId]);
    const token = user.rows[0]?.fcm_token;
    if (token) {
      const sender = await db.query("SELECT name FROM users WHERE id = $1", [senderId]);
      await sendPushNotification(
        [token], "Table Invite",
        `${sender.rows[0]?.name || "Someone"} requests you to share this table: ${tableName}`,
        { type: "invite", notificationId },
      );
    }
  }

  router.get("/tables/:tableId/chat", requireTablePermission("viewer"), async (req, res) => {
    try {
      return res.json(await tableService.getChatMessages(req.params.tableId));
    } catch (error) {
      logger.error("table_chat_fetch_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/tables/:tableId/invite", async (req, res) => {
    const { recipientId, permission } = req.body;
    if (!recipientId) return res.status(400).json({ error: "Recipient ID is required" });
    try {
      const table = await db.query("SELECT name FROM tables WHERE id = $1", [req.params.tableId]);
      if (!table.rows[0]) return res.status(404).json({ error: "Table not found" });
      await createInviteNotification(recipientId, req.user.id, req.params.tableId, table.rows[0].name, permission || "edit");
      return res.json({ success: true, message: "Invite sent" });
    } catch (error) {
      logger.error("table_invite_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/tables/:tableId/chat", async (req, res) => {
    try {
      const attachment = req.body.attachment && typeof req.body.attachment === "object" ? {
        name: req.body.attachment.name || null,
        type: req.body.attachment.type || null,
        url: req.body.attachment.url || null,
        size: req.body.attachment.size || null,
        originalName: req.body.attachment.originalName || null,
        uploadedAt: req.body.attachment.uploadedAt || null,
      } : null;
      const message = {
        id: uuidv4(), table_id: req.params.tableId,
        sender: req.body.sender || req.user.name, sender_id: req.user.id,
        text: req.body.text, timestamp: req.body.timestamp || new Date().toISOString(), attachment,
      };
      await db.query(
        "INSERT INTO table_chats (id, table_id, sender, text, timestamp, attachment, sender_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [message.id, message.table_id, message.sender, message.text, message.timestamp, attachment ? JSON.stringify(attachment) : null, message.sender_id],
      );
      const user = await db.query("SELECT avatar FROM users WHERE id = $1", [message.sender_id]);
      message.sender_avatar = user.rows[0]?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender)}&background=random&color=fff&bold=true`;
      message.senderAvatar = message.sender_avatar;
      io.to(message.table_id).emit("new_board_message", message);

      const tableResult = await db.query("SELECT name, workspace_id, shared_users FROM tables WHERE id = $1", [message.table_id]);
      const table = tableResult.rows[0];
      if (table) {
        const workspace = await db.query("SELECT owner_id FROM workspaces WHERE id = $1", [table.workspace_id]);
        const recipients = new Set(workspace.rows[0]?.owner_id ? [workspace.rows[0].owner_id] : []);
        if (Array.isArray(table.shared_users)) {
          table.shared_users.forEach((entry) => recipients.add(typeof entry === "string" ? entry : entry.userId));
        }
        recipients.delete(req.user.id);
        recipients.delete(undefined);
        const recipientIds = [...recipients];
        if (recipientIds.length) {
          const tokenResult = await db.query("SELECT fcm_token FROM users WHERE id = ANY($1) AND fcm_token IS NOT NULL", [recipientIds]);
          const tokens = tokenResult.rows.map((row) => row.fcm_token);
          if (tokens.length) {
            await sendPushNotification(tokens, `New message in ${table.name}`, `${message.sender}: ${message.text}`, {
              type: "chat_message", tableId: message.table_id, workspaceId: table.workspace_id, senderId: req.user.id,
            });
          }
          for (const recipientId of recipientIds) {
            await db.query(`INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW())`, [
              uuidv4(), recipientId, req.user.id, "chat_message", {
                subject: `New message in ${table.name}`, body: `${message.sender}: ${message.text}`,
                tableName: table.name, tableId: table.id, workspaceId: table.workspace_id, senderId: req.user.id,
              }, false,
            ]);
          }
        }
      }
      return res.json(message);
    } catch (error) {
      logger.error("table_chat_post_failed", { tableId: req.params.tableId, userId: req.user.id, error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = { createTableCollaborationRouter };
