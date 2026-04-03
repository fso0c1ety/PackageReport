import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(
      `SELECT n.*, u.name as sender_name, u.avatar as sender_avatar
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       WHERE n.recipient_id = $1
       ORDER BY n.read ASC, n.created_at DESC
       LIMIT 50`,
      [user.id]
    );
    const notifications = await Promise.all(result.rows.map(async (n) => {
      const data = n.data || {};
      if (!data.workspaceId && data.tableId) {
        try {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.tableId)) {
            const tableRes = await db.query('SELECT workspace_id FROM tables WHERE id = $1', [data.tableId]);
            if (tableRes.rows.length > 0) data.workspaceId = tableRes.rows[0].workspace_id;
          }
        } catch {}
      }
      return { ...n, data };
    }));
    return NextResponse.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
