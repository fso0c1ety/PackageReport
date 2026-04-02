import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { permission } = await req.json();
  if (!['read', 'edit', 'admin'].includes(permission)) return NextResponse.json({ error: 'Invalid permission' }, { status: 400 });
  try {
    const tableRes = await db.query(`
      SELECT t.id, t.shared_users
      FROM tables t
      JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.id = $1 AND w.owner_id = $2
    `, [params.tableId, user.id]);
    if (tableRes.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const table = tableRes.rows[0];
    if (Array.isArray(table.shared_users)) {
      const newSharedUsers = table.shared_users.map((u) =>
        u.userId === params.teammateId ? { ...u, permission } : u
      );
      await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(newSharedUsers), params.tableId]);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating granular teammate permission:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
