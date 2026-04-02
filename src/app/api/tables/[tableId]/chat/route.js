import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';
import { sendPushNotification } from '@/lib/firebase';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  try {
    const result = await db.query(`
      SELECT tc.*, u.avatar as sender_avatar
      FROM table_chats tc
      LEFT JOIN users u ON tc.sender_id = u.id
      WHERE tc.table_id = $1
      ORDER BY tc.timestamp ASC
    `, [params.tableId]);
    const rows = result.rows.map((row) => {
      let attachment = row.attachment;
      if (typeof attachment === 'string') { try { attachment = JSON.parse(attachment); } catch { attachment = null; } }
      return { ...row, attachment: attachment && typeof attachment === 'object' ? attachment : null };
    });
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const normalizedAttachment =
      body.attachment && typeof body.attachment === 'object'
        ? { name: body.attachment.name || null, type: body.attachment.type || null, url: body.attachment.url || null, size: body.attachment.size || null, originalName: body.attachment.originalName || null, uploadedAt: body.attachment.uploadedAt || null }
        : null;

    const newMessage = {
      id: uuidv4(),
      table_id: params.tableId,
      sender: body.sender || user.name,
      sender_id: user.id,
      text: body.text,
      timestamp: body.timestamp || Date.now(),
      attachment: normalizedAttachment,
    };

    await db.query(
      'INSERT INTO table_chats (id, table_id, sender, text, timestamp, attachment, sender_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [newMessage.id, newMessage.table_id, newMessage.sender, newMessage.text, newMessage.timestamp, newMessage.attachment ? JSON.stringify(newMessage.attachment) : null, newMessage.sender_id]
    );

    const userRes = await db.query('SELECT avatar FROM users WHERE id = $1', [newMessage.sender_id]);
    newMessage.sender_avatar = userRes.rows[0]?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(newMessage.sender)}&background=random&color=fff&bold=true`;
    newMessage.senderAvatar = newMessage.sender_avatar;

    // Note: Socket.IO real-time is not available in serverless. Use Supabase Realtime on the client.

    // Push notifications
    const tableRes = await db.query('SELECT name, workspace_id, shared_users FROM tables WHERE id = $1', [params.tableId]);
    if (tableRes.rows.length > 0) {
      const table = tableRes.rows[0];
      const workspaceRes = await db.query('SELECT owner_id FROM workspaces WHERE id = $1', [table.workspace_id]);
      let recipientIds = new Set();
      if (workspaceRes.rows.length > 0) recipientIds.add(workspaceRes.rows[0].owner_id);
      if (Array.isArray(table.shared_users)) {
        table.shared_users.forEach((u) => {
          if (typeof u === 'string') recipientIds.add(u);
          else if (u.userId) recipientIds.add(u.userId);
        });
      }
      recipientIds.delete(user.id);

      if (recipientIds.size > 0) {
        const recipientsArray = Array.from(recipientIds);
        const tokensRes = await db.query('SELECT id, fcm_token FROM users WHERE id = ANY($1) AND fcm_token IS NOT NULL', [recipientsArray]);
        const tokens = tokensRes.rows.map((r) => r.fcm_token);
        if (tokens.length > 0) {
          await sendPushNotification(tokens, `New message in ${table.name}`, `${newMessage.sender}: ${newMessage.text}`, { type: 'chat_message', tableId: params.tableId, workspaceId: table.workspace_id, senderId: user.id });
        }
        for (const recipientId of recipientsArray) {
          await db.query(`INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [uuidv4(), recipientId, user.id, 'chat_message', { subject: `New message in ${table.name}`, body: `${newMessage.sender}: ${newMessage.text}`, tableName: table.name, tableId: table.id, workspaceId: table.workspace_id, senderId: user.id }, false]);
        }
      }
    }

    return NextResponse.json(newMessage);
  } catch (err) {
    console.error('Error posting chat message:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
