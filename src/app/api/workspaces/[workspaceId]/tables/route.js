import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [params.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const isOwner = workspace.owner_id === user.id;
    const sharedCount = await db.query(
      `SELECT COUNT(*) FROM tables
       WHERE workspace_id = $1 AND EXISTS (
         SELECT 1
         FROM jsonb_array_elements(
           CASE
             WHEN jsonb_typeof(shared_users) = 'array' THEN shared_users
             ELSE '[]'::jsonb
           END
         ) AS elem
         WHERE elem->>'userId' = $2
       )`,
      [params.workspaceId, user.id]
    );
    if (!isOwner && parseInt(sharedCount.rows[0].count) === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tablesResult = isOwner
      ? await db.query('SELECT * FROM tables WHERE workspace_id = $1', [params.workspaceId])
      : await db.query(
          `SELECT * FROM tables
           WHERE workspace_id = $1 AND EXISTS (
             SELECT 1
             FROM jsonb_array_elements(
               CASE
                 WHEN jsonb_typeof(shared_users) = 'array' THEN shared_users
                 ELSE '[]'::jsonb
               END
             ) AS elem
             WHERE elem->>'userId' = $2
           )`,
          [params.workspaceId, user.id]
        );
    return NextResponse.json(tablesResult.rows);
  } catch (err) {
    console.error('Error fetching workspace tables:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [params.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    let columns = body.columns;
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      columns = [
        { id: uuidv4(), name: 'Text', type: 'Text', order: 0 },
        { id: uuidv4(), name: 'Status', type: 'Status', order: 1, options: [
          { value: 'Started', color: '#1976d2' },
          { value: 'Working on it', color: '#fdab3d' },
          { value: 'Done', color: '#00c875' },
        ]},
        { id: uuidv4(), name: 'Date', type: 'Date', order: 2 },
      ];
    }
    const newTable = { id: uuidv4(), name: body.name, workspace_id: params.workspaceId, columns, created_at: Date.now() };
    await db.query(
      'INSERT INTO tables (id, name, workspace_id, columns, created_at) VALUES ($1, $2, $3, $4, $5)',
      [newTable.id, newTable.name, newTable.workspace_id, JSON.stringify(newTable.columns), newTable.created_at]
    );
    return NextResponse.json(newTable);
  } catch (err) {
    console.error('Error creating table:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
