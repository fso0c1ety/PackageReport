import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (workspaceId) {
      const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [workspaceId]);
      const workspace = wsResult.rows[0];
      if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

      const tablesResult = await db.query(`
        SELECT t.*,
          COALESCE(json_agg(json_build_object('id', r.id, 'table_id', r.table_id, 'values', r.values)) FILTER (WHERE r.id IS NOT NULL), '[]') as tasks
        FROM tables t
        LEFT JOIN rows r ON t.id = r.table_id
        WHERE t.workspace_id = $1 AND (
          $2 = $3 OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(t.shared_users) = 'array' THEN t.shared_users
                ELSE '[]'::jsonb
              END
            ) AS elem
            WHERE elem->>'userId' = $3
          )
        )
        GROUP BY t.id
      `, [workspaceId, workspace.owner_id, user.id]);
      return NextResponse.json(tablesResult.rows);
    } else {
      const result = await db.query(`
        SELECT t.*,
          COALESCE(json_agg(json_build_object('id', r.id, 'table_id', r.table_id, 'values', r.values)) FILTER (WHERE r.id IS NOT NULL), '[]') as tasks
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        LEFT JOIN rows r ON t.id = r.table_id
        WHERE w.owner_id = $1 OR t.shared_users @> $2::jsonb
        GROUP BY t.id
      `, [user.id, JSON.stringify([{ userId: user.id }])]);
      return NextResponse.json(result.rows);
    }
  } catch (err) {
    console.error('Error fetching tables:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
  try {
    const wsResult = await db.query('SELECT * FROM workspaces WHERE id = $1', [body.workspaceId]);
    const workspace = wsResult.rows[0];
    if (!workspace || workspace.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
    const newTable = { id: uuidv4(), name: body.name, workspace_id: body.workspaceId, columns, created_at: Date.now() };
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
