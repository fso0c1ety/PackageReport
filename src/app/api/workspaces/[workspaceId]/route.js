import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(`
      SELECT DISTINCT w.*
      FROM workspaces w
      LEFT JOIN tables t ON w.id = t.workspace_id
      WHERE w.id = $1 AND (
        w.owner_id = $2 OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(t.shared_users) = 'array' THEN t.shared_users
              ELSE '[]'::jsonb
            END
          ) AS elem
          WHERE elem->>'userId' = $2
        )
      )
    `, [params.workspaceId, user.id]);
    if (!result.rows[0]) return NextResponse.json({ error: 'Workspace not found or forbidden' }, { status: 403 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching workspace:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [params.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    if (workspace.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const result = await db.query('UPDATE workspaces SET name = $1 WHERE id = $2 RETURNING *', [name.trim(), params.workspaceId]);
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating workspace:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [params.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    if (workspace.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await db.query('DELETE FROM workspaces WHERE id = $1', [params.workspaceId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting workspace:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
