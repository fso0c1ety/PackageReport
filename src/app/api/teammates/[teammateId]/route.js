import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const ownedTablesRes = await db.query(`
      SELECT t.id, t.shared_users
      FROM tables t
      JOIN workspaces w ON t.workspace_id = w.id
      WHERE w.owner_id = $1
    `, [user.id]);

    for (const table of ownedTablesRes.rows) {
      if (!Array.isArray(table.shared_users)) continue;
      const newSharedUsers = table.shared_users.filter((u) => u.userId !== params.teammateId);
      if (newSharedUsers.length !== table.shared_users.length) {
        await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(newSharedUsers), table.id]);
      }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error removing teammate:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
