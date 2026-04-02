import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(`
      SELECT t.*, w.owner_id as workspace_owner_id, w.name as workspace_name
      FROM tables t
      JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.id = $1 AND (w.owner_id = $2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem WHERE elem->>'userId' = $2))
    `, [params.tableId, user.id]);
    if (!result.rows[0]) return NextResponse.json({ error: 'Table not found or forbidden' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching table:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
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

    const body = await req.json();
    if (typeof body.name === 'string') {
      await db.query('UPDATE tables SET name = $1 WHERE id = $2', [body.name, params.tableId]);
      return NextResponse.json({ success: true, name: body.name });
    }
    return NextResponse.json({ error: 'Missing or invalid name' }, { status: 400 });
  } catch (err) {
    console.error('Error patching table:', err);
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
    if (!workspace || workspace.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await db.query('DELETE FROM tables WHERE id = $1', [params.tableId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting table:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
