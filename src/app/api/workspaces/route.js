import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(`
      SELECT DISTINCT
        w.*,
        u.name as owner_name,
        u.avatar as owner_avatar,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object('id', um.id, 'name', um.name, 'avatar', um.avatar))
          FROM (
            SELECT DISTINCT (elem->>'userId') as uid
            FROM tables t2, jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(t2.shared_users) = 'array' THEN t2.shared_users
                ELSE '[]'::jsonb
              END
            ) elem
            WHERE t2.workspace_id = w.id
          ) distinct_users
          JOIN users um ON um.id = distinct_users.uid
          WHERE um.id != w.owner_id
        ), '[]'::jsonb) as members
      FROM workspaces w
      JOIN users u ON w.owner_id = u.id
      LEFT JOIN tables t ON w.id = t.workspace_id
      WHERE w.owner_id = $1 OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(t.shared_users) = 'array' THEN t.shared_users
            ELSE '[]'::jsonb
          END
        ) AS elem
        WHERE elem->>'userId' = $1
      )
    `, [user.id]);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching workspaces:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const newWorkspace = { id: uuidv4(), name: body.name || 'Untitled Workspace', owner_id: user.id };
    await db.query('INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)', [newWorkspace.id, newWorkspace.name, newWorkspace.owner_id]);

    const defaultTableId = uuidv4();
    const columns = [
      { id: uuidv4(), name: 'Text', type: 'Text', order: 0 },
      { id: uuidv4(), name: 'Status', type: 'Status', order: 1, options: [
        { value: 'Started', color: '#1976d2' },
        { value: 'Working on it', color: '#fdab3d' },
        { value: 'Done', color: '#00c875' },
      ]},
      { id: uuidv4(), name: 'Date', type: 'Date', order: 2 },
    ];
    await db.query(
      'INSERT INTO tables (id, name, workspace_id, columns, created_at) VALUES ($1, $2, $3, $4, $5)',
      [defaultTableId, `${newWorkspace.name} Table`, newWorkspace.id, JSON.stringify(columns), Date.now()]
    );
    return NextResponse.json(newWorkspace);
  } catch (err) {
    console.error('Error creating workspace:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
