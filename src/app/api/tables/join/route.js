import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { inviteCode } = await req.json();
  if (!inviteCode) return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
  try {
    const result = await db.query('SELECT * FROM tables WHERE UPPER(invite_code) = $1', [inviteCode.toUpperCase()]);
    const table = result.rows[0];
    if (!table) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });

    let sharedUsers = Array.isArray(table.shared_users) ? table.shared_users : [];
    if (!sharedUsers.some((u) => u.userId === user.id)) {
      sharedUsers.push({ userId: user.id, permission: 'edit' });
      await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(sharedUsers), table.id]);
    }
    return NextResponse.json({ success: true, tableId: table.id, workspaceId: table.workspace_id });
  } catch (err) {
    console.error('Error joining table:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
