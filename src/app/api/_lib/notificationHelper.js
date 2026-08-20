import { randomUUID } from "crypto";
import { ensureUserNotificationColumns, pool } from "./server";
import { sendPushNotification } from "./firebaseAdmin";
import { requireBoardPermission, requireRowPermission } from "./authorization";

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
  const candidateResult = await pool.query(`
    SELECT user_id FROM (
      SELECT w.owner_id::text AS user_id FROM workspaces w WHERE w.id=$1
      UNION SELECT wm.user_id::text FROM workspace_members wm WHERE wm.workspace_id=$1
      UNION SELECT bma.user_id::text FROM board_member_access bma WHERE bma.table_id=$2
    ) candidates WHERE user_id IS NOT NULL
  `, [table.workspace_id, table.id]);
  for (const candidate of candidateResult.rows) recipientIds.add(String(candidate.user_id));
  for (const entry of toArray(table.shared_users)) {
    const sharedUserId = getSharedUserId(entry);
    if (sharedUserId) recipientIds.add(String(sharedUserId));
  }

  if (senderId) {
    recipientIds.delete(senderId);
  }

  const recipients = [];
  for (const recipientId of recipientIds) {
    const access = taskId
      ? await requireRowPermission(pool, recipientId, taskId, "viewer", table.id)
      : await requireBoardPermission(pool, recipientId, table.id, "viewer");
    if (access) recipients.push(recipientId);
  }
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

  await ensureUserNotificationColumns();

  const userRes = await pool.query(
    `
      SELECT
        id,
        fcm_token,
        fcm_tokens,
        COALESCE(push_notifications, TRUE) AS push_notifications
      FROM users
      WHERE id = ANY($1)
    `,
    [recipients]
  );

  const tokenSet = new Set();
  const insertedRecipientIds = new Set();
  for (const recipientId of recipients) {
    const dedupeKey = extraData?.dedupeKey ? `${String(extraData.dedupeKey)}:${recipientId}` : null;
    const inserted = await pool.query(
      `INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at, dedupe_key)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
       ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
       RETURNING id`,
      [randomUUID(), recipientId, senderId, type, notificationData, false, dedupeKey]
    );
    if (inserted.rows.length > 0) insertedRecipientIds.add(String(recipientId));
  }

  for (const matchedUser of userRes.rows) {
    if (!insertedRecipientIds.has(String(matchedUser.id)) || matchedUser.push_notifications === false) continue;
    if (matchedUser.fcm_token) tokenSet.add(matchedUser.fcm_token);
    for (const token of toArray(matchedUser.fcm_tokens)) if (token) tokenSet.add(token);
  }
  const tokens = Array.from(tokenSet);
  if (tokens.length === 0) {
    return { recipientCount: insertedRecipientIds.size, successCount: 0, failureCount: 0 };
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
    recipientCount: insertedRecipientIds.size,
    successCount: pushResult?.successCount || 0,
    failureCount: pushResult?.failureCount || 0,
  };
}
