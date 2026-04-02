import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const tablesResult = await db.query('SELECT * FROM tables WHERE workspace_id = $1', [params.workspaceId]);
    for (const table of tablesResult.rows) {
      if (Array.isArray(table.shared_users)) {
        const newSharedUsers = table.shared_users.filter((u) => {
          const uId = typeof u === 'string' ? u : u.userId;
          return uId !== user.id;
        });
        if (newSharedUsers.length !== table.shared_users.length) {
          await db.query('UPDATE tables SET shared_users = $1::jsonb WHERE id = $2', [JSON.stringify(newSharedUsers), table.id]);
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error leaving workspace:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
