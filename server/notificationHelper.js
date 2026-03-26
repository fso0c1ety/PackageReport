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
            const tokensRes = await db.query('SELECT fcm_token, fcm_tokens FROM users WHERE id = ANY($1)', [recipientsArray]);
            let tokens = new Set();
            tokensRes.rows.forEach(r => {
                if (r.fcm_token) tokens.add(r.fcm_token);
                if (Array.isArray(r.fcm_tokens)) {
                    r.fcm_tokens.forEach(t => { if (t) tokens.add(t); });
                }
            });
            const tokensArray = Array.from(tokens);
            const safeData = data || {};
            if (tokensArray.length > 0) {
                await sendPushNotification(tokensArray, title, body, {
                    type: type || 'chat_message',
                    tableId: table ? table.id : undefined,
                    workspaceId: table ? table.workspace_id : undefined,
                    taskId: safeData.taskId,
                    ...safeData
                });
            }
            
            // 2. Save In-App Notifications
            if (table) {
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
                        taskId: safeData.taskId,
                        ...safeData
                    }, false]);
                }
            }
        }
    } catch (e) {
        console.error('[Notification] Failed to send:', e);
    }
}

async function sendDirectNotification(recipientId, title, body, type, data) {
    try {
        const safeData = data || {};
        // 1. Send Push Notification if tokens exist
        const tokenRes = await db.query('SELECT fcm_token, fcm_tokens FROM users WHERE id = $1', [recipientId]);
        if (tokenRes.rows.length > 0) {
            const r = tokenRes.rows[0];
            let tokens = new Set();
            if (r.fcm_token) tokens.add(r.fcm_token);
            if (Array.isArray(r.fcm_tokens)) {
                r.fcm_tokens.forEach(t => { if (t) tokens.add(t); });
            }
            const tokensArray = Array.from(tokens);
            const isCall = type === 'incoming_call';
            if (tokensArray.length > 0) {
                // For calls, we send as data-only to allow the service worker/app background logic to handle the ringing.
                // Our updated sendPushNotification handles moving title/body to data if they are passed or if they are null.
                await sendPushNotification(
                    tokensArray, 
                    isCall ? null : title, 
                    isCall ? null : body, 
                    {
                        type: type || 'generic',
                        title: title, // Explicitly include in data for calls
                        body: body,
                        ...safeData
                    }
                );
            }
        }

        // 2. Save In-App Notification
        await db.query(`
            INSERT INTO notifications (id, recipient_id, type, data, read, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
        `, [uuidv4(), recipientId, type || 'generic', {
            subject: title,
            body: body,
            ...safeData
        }, false]);
    } catch (e) {
        console.error('[Notification] Failed to send direct notification:', e);
    }
}

module.exports = { sendNotification, sendDirectNotification };