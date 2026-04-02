import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [params.tableId]);
    const table = result.rows[0];
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    const isOwner = workspace && workspace.owner_id === user.id;
    const isShared = Array.isArray(table.shared_users) && table.shared_users.some((u) => u.userId === user.id);
    if (!isOwner && !isShared) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { columns } = await req.json();
    await db.query('UPDATE tables SET columns = $1 WHERE id = $2', [JSON.stringify(columns), params.tableId]);
    return NextResponse.json({ success: true, columns });
  } catch (err) {
    console.error('Error updating columns:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
