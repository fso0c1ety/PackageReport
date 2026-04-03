import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';
import { sendPushNotification } from '@/lib/firebase';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { recipientId, permission } = await req.json();
  if (!recipientId) return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
  try {
    const tableRes = await db.query('SELECT name FROM tables WHERE id = $1', [params.tableId]);
    if (tableRes.rows.length === 0) return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    const tableName = tableRes.rows[0].name;
    const perm = permission || 'edit';

    const notifId = uuidv4();
    await db.query(
      'INSERT INTO notifications (id, recipient_id, sender_id, type, data) VALUES ($1, $2, $3, $4, $5)',
      [notifId, recipientId, user.id, 'invite', JSON.stringify({ tableId: params.tableId, tableName, permission: perm })]
    );
    const userRes = await db.query('SELECT fcm_token FROM users WHERE id = $1', [recipientId]);
    const token = userRes.rows[0]?.fcm_token;
    if (token) {
      const senderRes = await db.query('SELECT name FROM users WHERE id = $1', [user.id]);
      const senderName = senderRes.rows[0]?.name || 'Someone';
      await sendPushNotification([token], 'Table Invite', `${senderName} requests you to share this table: ${tableName}`, {
        type: 'invite', notificationId: notifId,
      });
    }
    return NextResponse.json({ success: true, message: 'Invite sent' });
  } catch (err) {
    console.error('Error sending invite:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
