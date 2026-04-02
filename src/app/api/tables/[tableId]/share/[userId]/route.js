import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [params.tableId]);
    const table = result.rows[0];
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if ((!workspace || workspace.owner_id !== user.id) && user.id !== params.userId) {
      return NextResponse.json({ error: 'Only owners or the user themselves can remove shared access' }, { status: 403 });
    }

    const filtered = (table.shared_users || []).filter((u) => u.userId !== params.userId);
    await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(filtered), params.tableId]);
    return NextResponse.json({ success: true, shared_users: filtered });
  } catch (err) {
    console.error('Error removing shared user:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
