import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [params.tableId]);
    const table = result.rows[0];
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== user.id) return NextResponse.json({ error: 'Only owners can manage shared users' }, { status: 403 });

    const shared = table.shared_users || [];
    if (shared.length === 0) return NextResponse.json([]);

    const userIds = shared.map((u) => u.userId);
    const usersResult = await db.query('SELECT id, name, email, avatar FROM users WHERE id = ANY($1)', [userIds]);
    const usersWithPerms = usersResult.rows.map((u) => {
      const shareInfo = shared.find((s) => s.userId === u.id);
      return { ...u, permission: shareInfo ? shareInfo.permission : 'read' };
    });
    return NextResponse.json(usersWithPerms);
  } catch (err) {
    console.error('Error fetching shared users:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
