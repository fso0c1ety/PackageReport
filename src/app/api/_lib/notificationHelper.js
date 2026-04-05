import { randomUUID } from "crypto";
import { pool } from "./server";
import { sendPushNotification } from "./firebaseAdmin";

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getSharedUserId(entry) {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    return entry;
  }

  return entry.userId || entry.id || null;
}

export async function sendTableNotification({
  table,
  title,
  body,
  type = "chat_message",
  taskId = null,
  senderId = null,
  extraData = {},
}) {
  if (!table?.id || !table?.workspace_id) {
    return { recipientCount: 0, successCount: 0, failureCount: 0 };
  }

  const recipientIds = new Set();
  const workspaceRes = await pool.query("SELECT owner_id FROM workspaces WHERE id = $1", [table.workspace_id]);
  const ownerId = workspaceRes.rows[0]?.owner_id;

  if (ownerId) {
    recipientIds.add(ownerId);
  }

  for (const entry of toArray(table.shared_users)) {
    const sharedUserId = getSharedUserId(entry);
    if (sharedUserId) {
      recipientIds.add(sharedUserId);
    }
  }

  if (senderId) {
    recipientIds.delete(senderId);
  }

  const recipients = Array.from(recipientIds).filter(Boolean);
  if (recipients.length === 0) {
    return { recipientCount: 0, successCount: 0, failureCount: 0 };
  }

  const notificationData = {
    subject: title,
    body,
    tableName: table.name || "Table",
    tableId: table.id,
    workspaceId: table.workspace_id,
    ...(taskId ? { taskId } : {}),
    ...(senderId ? { senderId } : {}),
    ...(extraData || {}),
  };

  const userRes = await pool.query(
    "SELECT id, fcm_token, fcm_tokens FROM users WHERE id = ANY($1)",
    [recipients]
  );

  const tokenSet = new Set();
  for (const matchedUser of userRes.rows) {
    if (matchedUser.fcm_token) {
      tokenSet.add(matchedUser.fcm_token);
    }

    for (const token of toArray(matchedUser.fcm_tokens)) {
      if (token) {
        tokenSet.add(token);
      }
    }
  }

  for (const recipientId of recipients) {
    await pool.query(
      `
        INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
      [randomUUID(), recipientId, senderId, type, notificationData, false]
    );
  }

  const tokens = Array.from(tokenSet);
  if (tokens.length === 0) {
    return { recipientCount: recipients.length, successCount: 0, failureCount: 0 };
  }

  const pushResult = await sendPushNotification(tokens, title, body, {
    type,
    tableId: table.id,
    workspaceId: table.workspace_id,
    ...(taskId ? { taskId } : {}),
    ...(senderId ? { senderId } : {}),
    ...(extraData || {}),
  });

  return {
    recipientCount: recipients.length,
    successCount: pushResult?.successCount || 0,
    failureCount: pushResult?.failureCount || 0,
  };
}
