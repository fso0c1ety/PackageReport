const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const { sendPushNotification } = require('./firebase'); 

async function sendNotification(title, body, type, data, table, excludeUserId = null) {
    try {
        // Get recipients (workspace owner + shared users)
        const workspaceRes = await db.query('SELECT owner_id FROM workspaces WHERE id = $1', [table.workspace_id]);
        let recipientIds = new Set();
        if (workspaceRes.rows.length > 0) recipientIds.add(workspaceRes.rows[0].owner_id);
        
        if (Array.isArray(table.shared_users)) {
            table.shared_users.forEach(u => {
                if (typeof u === 'string') recipientIds.add(u);
                else if (u.userId) recipientIds.add(u.userId);
            });
        }

        // Remove sender
        if (excludeUserId) recipientIds.delete(excludeUserId);
        
        if (recipientIds.size > 0) {
            const recipientsArray = Array.from(recipientIds);
            
            // 1. Send Push Notifications
            const tokensRes = await db.query('SELECT fcm_token FROM users WHERE id = ANY($1) AND fcm_token IS NOT NULL', [recipientsArray]);
            const tokens = tokensRes.rows.map(r => r.fcm_token);
            if (tokens.length > 0) {
                await sendPushNotification(tokens, title, body, {
                    type: type || 'chat_message',
                    tableId: table.id,
                    workspaceId: table.workspace_id,
                    taskId: data.taskId,
                    ...data
                });
            }
            
            // 2. Save In-App Notifications
            for (const recipientId of recipientsArray) {
                 await db.query(`
                   INSERT INTO notifications (id, recipient_id, type, data, read, created_at)
                   VALUES ($1, $2, $3, $4, $5, NOW())
               `, [uuidv4(), recipientId, type || 'chat_message', {
                   subject: title,
                   body: body,
                   tableName: table.name,
                   tableId: table.id,
                   workspaceId: table.workspace_id,
                   taskId: data.taskId,
                   ...data
               }, false]);
            }
        }
    } catch (e) {
        console.error('[Notification] Failed to send:', e);
    }
}

async function sendDirectNotification(recipientId, title, body, type, data) {
    try {
        // 1. Send Push Notification if token exists
        const tokenRes = await db.query('SELECT fcm_token FROM users WHERE id = $1 AND fcm_token IS NOT NULL', [recipientId]);
        if (tokenRes.rows.length > 0) {
            await sendPushNotification([tokenRes.rows[0].fcm_token], title, body, {
                type: type || 'generic',
                ...data
            });
        }

        // 2. Save In-App Notification
        await db.query(`
            INSERT INTO notifications (id, recipient_id, type, data, read, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
        `, [uuidv4(), recipientId, type || 'generic', {
            subject: title,
            body: body,
            ...data
        }, false]);
    } catch (e) {
        console.error('[Notification] Failed to send direct notification:', e);
    }
}

module.exports = { sendNotification, sendDirectNotification };