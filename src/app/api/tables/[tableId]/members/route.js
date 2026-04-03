import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const accessRes = await db.query(`
      SELECT t.id, t.shared_users, w.owner_id
      FROM tables t
      JOIN workspaces w ON t.workspace_id = w.id
      WHERE t.id = $1 AND (w.owner_id = $2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t.shared_users) AS elem WHERE elem->>'userId' = $2))
    `, [params.tableId, user.id]);
    if (accessRes.rows.length === 0) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const table = accessRes.rows[0];
    const ownerId = table.owner_id;
    const sharedUserIds = (table.shared_users || []).map((u) => u.userId);
    const memberIds = [...new Set([ownerId, ...sharedUserIds])];

    const usersRes = await db.query('SELECT id, name, email, avatar FROM users WHERE id = ANY($1)', [memberIds]);
    const members = usersRes.rows.map((u) => ({
      ...u,
      avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff&bold=true`,
      role: u.id === ownerId ? 'owner' : 'member',
    })).sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.name.localeCompare(b.name)));

    return NextResponse.json(members);
  } catch (err) {
    console.error('Error fetching table members:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
