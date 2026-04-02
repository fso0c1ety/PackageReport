import db from './db.js';
import { v4 as uuidv4 } from 'uuid';
import { sendPushNotification } from './firebase.js';

export async function sendNotification(title, body, type, data, table, excludeUserId = null) {
  try {
    const workspaceRes = await db.query('SELECT owner_id FROM workspaces WHERE id = $1', [table.workspace_id]);
    let recipientIds = new Set();
    if (workspaceRes.rows.length > 0) recipientIds.add(workspaceRes.rows[0].owner_id);

    if (Array.isArray(table.shared_users)) {
      table.shared_users.forEach((u) => {
        if (typeof u === 'string') recipientIds.add(u);
        else if (u.userId) recipientIds.add(u.userId);
      });
    }
    if (excludeUserId) recipientIds.delete(excludeUserId);

    if (recipientIds.size > 0) {
      const recipientsArray = Array.from(recipientIds);

      const tokensRes = await db.query(
        'SELECT fcm_token, fcm_tokens FROM users WHERE id = ANY($1)',
        [recipientsArray]
      );
      let tokens = new Set();
      tokensRes.rows.forEach((r) => {
        if (r.fcm_token) tokens.add(r.fcm_token);
        if (Array.isArray(r.fcm_tokens)) r.fcm_tokens.forEach((t) => { if (t) tokens.add(t); });
      });
      const tokensArray = Array.from(tokens);
      const safeData = data || {};
      if (tokensArray.length > 0) {
        await sendPushNotification(tokensArray, title, body, {
          type: type || 'chat_message',
          tableId: table?.id,
          workspaceId: table?.workspace_id,
          taskId: safeData.taskId,
          ...safeData,
        });
      }

      if (table) {
        for (const recipientId of recipientsArray) {
          await db.query(
            `INSERT INTO notifications (id, recipient_id, type, data, read, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [uuidv4(), recipientId, type || 'chat_message', {
              subject: title, body, tableName: table.name, tableId: table.id,
              workspaceId: table.workspace_id, taskId: safeData.taskId, ...safeData,
            }, false]
          );
        }
      }
    }
  } catch (e) {
    console.error('[Notification] Failed:', e);
  }
}

export async function sendDirectNotification(recipientId, title, body, type, data) {
  try {
    const safeData = data || {};
    const tokenRes = await db.query('SELECT fcm_token, fcm_tokens FROM users WHERE id = $1', [recipientId]);
    if (tokenRes.rows.length > 0) {
      const r = tokenRes.rows[0];
      let tokens = new Set();
      if (r.fcm_token) tokens.add(r.fcm_token);
      if (Array.isArray(r.fcm_tokens)) r.fcm_tokens.forEach((t) => { if (t) tokens.add(t); });
      const tokensArray = Array.from(tokens);
      if (tokensArray.length > 0) {
        await sendPushNotification(tokensArray, title, body, {
          type: type || 'generic',
          title,
          body,
          ...safeData,
        });
      }
    }

    await db.query(
      `INSERT INTO notifications (id, recipient_id, type, data, read, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), recipientId, type || 'generic', { subject: title, body, ...safeData }, false]
    );
  } catch (e) {
    console.error('[Notification] Failed to send direct notification:', e);
  }
}
