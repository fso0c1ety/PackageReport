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
    const ownedTablesRes = await db.query(`
      SELECT t.id, t.shared_users
      FROM tables t
      JOIN workspaces w ON t.workspace_id = w.id
      WHERE w.owner_id = $1
    `, [user.id]);

    for (const table of ownedTablesRes.rows) {
      if (!Array.isArray(table.shared_users)) continue;
      let modified = false;
      const newSharedUsers = table.shared_users.map((u) => {
        if (u.userId === params.teammateId) { modified = true; return { ...u, permission }; }
        return u;
      });
      if (modified) await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(newSharedUsers), table.id]);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating teammate permission:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
