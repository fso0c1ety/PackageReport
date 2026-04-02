import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';
import { sendPushNotification } from '@/lib/firebase';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, permission } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  const perm = permission === 'admin' ? 'admin' : permission === 'read' ? 'read' : 'edit';

  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [params.tableId]);
    const table = result.rows[0];
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    const isOwner = workspace && workspace.owner_id === user.id;
    const callerShare = (table.shared_users || []).find((u) => u.userId === String(user.id));
    const isAdmin = callerShare && callerShare.permission === 'admin';
    if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Only workspace owners and admins can share tables' }, { status: 403 });

    const sharedUsers = table.shared_users || [];
    const existingIndex = sharedUsers.findIndex((u) => u.userId === userId);
    if (existingIndex !== -1) {
      sharedUsers[existingIndex].permission = perm;
      await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(sharedUsers), params.tableId]);
      return NextResponse.json({ success: true, shared_users: sharedUsers, message: 'Permission updated' });
    }

    // Send invite notification
    const notifId = uuidv4();
    await db.query(
      'INSERT INTO notifications (id, recipient_id, sender_id, type, data) VALUES ($1, $2, $3, $4, $5)',
      [notifId, userId, user.id, 'invite', JSON.stringify({ tableId: table.id, tableName: table.name, permission: perm })]
    );
    const userRes = await db.query('SELECT fcm_token FROM users WHERE id = $1', [userId]);
    const token = userRes.rows[0]?.fcm_token;
    if (token) {
      await sendPushNotification([token], 'Table Invite', `${user.name} requests you to share this table: ${table.name}`, {
        type: 'invite', notificationId: notifId, tableId: table.id,
      });
    }
    return NextResponse.json({ success: true, message: 'Invite sent to user' });
  } catch (err) {
    console.error('Error sharing table:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
