import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  try {
    const result = await db.query(
      "SELECT * FROM rows WHERE table_id = $1 ORDER BY (values->>'order')::int ASC NULLS FIRST, created_at DESC",
      [params.tableId]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const newTask = { id: uuidv4(), table_id: params.tableId, values: body.values || {}, created_by: user.id };
    await db.query(
      'INSERT INTO rows (id, table_id, values, created_by, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [newTask.id, newTask.table_id, JSON.stringify(newTask.values), newTask.created_by]
    );
    return NextResponse.json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sendNotification } = await import('@/lib/notificationHelper');
  const { sendEmail } = await import('@/lib/mailer');
  const { sendPushNotification } = await import('@/lib/firebase');

  try {
    const body = await req.json();
    const { id, values } = body;
    if (!id || typeof values !== 'object') return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    const tableResult = await db.query('SELECT * FROM tables WHERE id = $1', [params.tableId]);
    const table = tableResult.rows[0];
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 });

    const rowResult = await db.query('SELECT * FROM rows WHERE id = $1 AND table_id = $2', [id, params.tableId]);
    const row = rowResult.rows[0];
    if (!row) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const oldValues = row.values || {};
    const newValues = values || {};
    const timestamp = new Date().toISOString();
    const newActivity = [];
    const oldActivity = oldValues.activity || [];

    // Task chat notification
    if (Array.isArray(newValues.message)) {
      const oldLen = Array.isArray(oldValues.message) ? oldValues.message.length : 0;
      if (newValues.message.length > oldLen) {
        const lastMsg = newValues.message[newValues.message.length - 1];
        const isScheduled = lastMsg.scheduledFor && new Date(lastMsg.scheduledFor) > new Date();
        lastMsg.notificationSent = !isScheduled;
        if (!isScheduled) {
          let taskName = 'Task';
          if (Array.isArray(table.columns)) {
            const taskCol = table.columns.find((c) => c.id === 'task') || table.columns[0];
            if (taskCol && newValues[taskCol.id]) taskName = newValues[taskCol.id];
          }
          const userName = lastMsg.sender || (user ? user.name : 'User');
          try {
            await sendNotification('New Discussion', `${userName} commented on the ${taskName}: ${lastMsg.text}`, 'task_chat', { taskId: id }, table, user.id);
          } catch (e) { console.error('[Task Chat] notify failed:', e); }
        }
      }
    }

    // File comment notifications
    const columns = table.columns || [];
    for (const col of columns) {
      if (col.type === 'Files' || col.type === 'File') {
        const oldFiles = Array.isArray(oldValues[col.id]) ? oldValues[col.id] : [];
        const newFiles = Array.isArray(newValues[col.id]) ? newValues[col.id] : [];
        for (const nFile of newFiles) {
          const oFile = oldFiles.find((o) => o.url === nFile.url);
          if (oFile && Array.isArray(nFile.comments)) {
            const oldLen = Array.isArray(oFile.comments) ? oFile.comments.length : 0;
            if (nFile.comments.length > oldLen) {
              const lastComment = nFile.comments[nFile.comments.length - 1];
              const userName = lastComment.user || (user ? user.name : 'User');
              try {
                await sendNotification('New File Comment', `${userName} commented on the ${nFile.name || 'File'}: ${lastComment.text}`, 'file_comment', { taskId: id }, table, user.id);
              } catch (e) { console.error('[File Comment] notify failed:', e); }
            }
          }
        }
      }
    }

    // Activity log
    Object.keys(newValues).forEach((key) => {
      if (key === 'message' || key === 'activity') return;
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        const col = columns.find((c) => c.id === key);
        const colName = col ? col.name : key;
        let logText = `Updated ${colName}`;
        const nv = newValues[key];
        if (nv !== null && typeof nv !== 'object') logText += ` to "${nv}"`;
        newActivity.push({ text: logText, time: timestamp, user: 'User' });
      }
    });

    const mergedValues = { ...oldValues, ...newValues, activity: newActivity.length > 0 ? [...newActivity, ...oldActivity] : oldActivity };
    await db.query('UPDATE rows SET values = $1 WHERE id = $2', [JSON.stringify(mergedValues), id]);

    // Automation
    const autoResult = await db.query(
      `SELECT * FROM automations WHERE table_id = $1 AND enabled = true
         AND (task_ids IS NULL OR jsonb_array_length(task_ids) = 0 OR task_ids @> jsonb_build_array($2::text))
       ORDER BY id ASC`,
      [params.tableId, id]
    );
    for (const automation of autoResult.rows) {
      if (!automation.trigger_col) continue;
      if (oldValues[automation.trigger_col] === newValues[automation.trigger_col]) continue;

      const subject = `Task updated: ${table.name}`;
      const automationCols = automation.cols || [];
      let htmlRows = '';
      let textLines = [];
      automationCols.forEach((colId) => {
        const col = columns.find((c) => c.id === colId);
        if (!col) return;
        let val = newValues[colId];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        htmlRows += `<tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#4b5563;font-size:14px;font-weight:500;width:40%">${col.name}</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:600">${val || '-'}</td></tr>`;
        textLines.push(`${col.name}: ${val || '-'}`);
      });
      const textSummary = textLines.join('\n') || 'Check task for details.';
      const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:30px 20px;background:#f3f4f6"><div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 15px -3px rgba(0,0,0,.1)"><div style="background:#2563eb;padding:32px 24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">Smart Manage</h1></div><div style="padding:40px 32px"><h2 style="margin-top:0;color:#1f2937">Task Updated</h2><p style="color:#4b5563">An update occurred in <strong>${table.name}</strong>:</p><table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden"><tbody>${htmlRows}</tbody></table></div></div></div>`;
      const recipients = automation.recipients || [];
      const actionType = automation.action_type || 'email';
      if (recipients.length === 0) continue;

      const logRes = await db.query(
        'INSERT INTO activity_logs (recipients, subject, html, timestamp, table_id, task_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [JSON.stringify(recipients), subject, html, Date.now(), table.id, id, 'pending']
      );
      const logId = logRes.rows[0].id;

      (async () => {
        try {
          let successEmail = true, successNotif = true, errorMessages = [];
          if (actionType === 'email' || actionType === 'both') {
            try { await sendEmail({ to: recipients, subject, html }); } catch (e) { successEmail = false; errorMessages.push(`Email: ${e.message}`); }
          }
          if (actionType === 'notification' || actionType === 'both') {
            try {
              const userRes = await db.query('SELECT id, email, fcm_token, fcm_tokens FROM users WHERE email = ANY($1)', [recipients]);
              const fcmTokens = new Set();
              for (const u of userRes.rows) {
                await db.query(`INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                  [uuidv4(), u.id, null, 'automation', { subject, body: textSummary, tableName: table.name, tableId: table.id, taskId: id, logId }, false]);
                if (u.fcm_token) fcmTokens.add(u.fcm_token);
                if (Array.isArray(u.fcm_tokens)) u.fcm_tokens.forEach((t) => { if (t) fcmTokens.add(t); });
              }
              const tokensArray = Array.from(fcmTokens);
              if (tokensArray.length > 0) await sendPushNotification(tokensArray, subject, textSummary, { type: 'automation', tableId: table.id, workspaceId: table.workspace_id, taskId: id });
            } catch (e) { successNotif = false; errorMessages.push(`Notification: ${e.message}`); }
          }
          const finalStatus = (!successEmail || !successNotif) ? 'error' : 'sent';
          await db.query('UPDATE activity_logs SET status = $1, error_message = $2 WHERE id = $3', [finalStatus, errorMessages.join('; ') || null, logId]);
        } catch (e) {
          console.error('[AUTOMATION] Critical error:', e);
          await db.query('UPDATE activity_logs SET status = $1, error_message = $2 WHERE id = $3', ['error', 'Critical execution failure', logId]);
        }
      })();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating task:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
