import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const notifResult = await db.query('SELECT * FROM notifications WHERE id = $1 AND recipient_id = $2', [params.id, user.id]);
    const notification = notifResult.rows[0];
    if (!notification) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    if (notification.type !== 'invite') return NextResponse.json({ error: 'Not an invite' }, { status: 400 });

    const { tableId, permission } = notification.data || {};
    if (!tableId) return NextResponse.json({ error: 'Invalid invite data' }, { status: 400 });

    const tableResult = await db.query('SELECT * FROM tables WHERE id = $1', [tableId]);
    const table = tableResult.rows[0];
    if (table) {
      let sharedUsers = Array.isArray(table.shared_users) ? table.shared_users : [];
      if (!sharedUsers.some((u) => u.userId === user.id)) {
        sharedUsers.push({ userId: user.id, permission: permission || 'edit' });
        await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(sharedUsers), tableId]);
      }
    }
    await db.query('DELETE FROM notifications WHERE id = $1', [params.id]);
    return NextResponse.json({ success: true, message: 'Invite accepted' });
  } catch (err) {
    console.error('Error accepting invite:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
