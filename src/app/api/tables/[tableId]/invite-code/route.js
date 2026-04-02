import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [params.tableId]);
    const table = result.rows[0];
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== user.id) return NextResponse.json({ error: 'Only workspace owners can manage invite codes' }, { status: 403 });

    let inviteCode = table.invite_code;
    if (!inviteCode) {
      inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.query('UPDATE tables SET invite_code = $1 WHERE id = $2', [inviteCode, params.tableId]);
    }
    return NextResponse.json({ invite_code: inviteCode });
  } catch (err) {
    console.error('Error managing invite code:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query('SELECT * FROM tables WHERE id = $1', [params.tableId]);
    const table = result.rows[0];
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 });

    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [table.workspace_id]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== user.id) return NextResponse.json({ error: 'Only workspace owners can stop sharing' }, { status: 403 });

    await db.query("UPDATE tables SET invite_code = NULL, shared_users = '[]'::jsonb WHERE id = $1", [params.tableId]);
    return NextResponse.json({ success: true, message: 'Sharing stopped and shared users removed' });
  } catch (err) {
    console.error('Error deleting invite code:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
