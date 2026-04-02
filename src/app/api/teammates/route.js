import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(`
      WITH owned_tables AS (
        SELECT t.id, t.name as table_name, t.shared_users, w.name as workspace_name
        FROM tables t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE w.owner_id = $1
      ),
      all_collaborators AS (
        SELECT
          (elem->>'userId') as user_id,
          'joined' as status,
        ot.id as table_id,
        ot.table_name,
        ot.workspace_name,
        (elem->>'permission') as permission
        FROM owned_tables ot
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(ot.shared_users) = 'array' THEN ot.shared_users
            ELSE '[]'::jsonb
          END
        ) AS elem
        UNION ALL
        SELECT
          n.recipient_id::text as user_id,
          'pending' as status,
          NULL as table_id,
          NULL as table_name,
          NULL as workspace_name,
          'edit' as permission
        FROM notifications n
        WHERE n.sender_id = $1 AND n.type = 'invite'
      ),
      unique_collaborators AS (
        SELECT
          user_id,
          MIN(status) as status,
          jsonb_agg(jsonb_build_object('tableId', table_id, 'tableName', table_name, 'workspaceName', workspace_name, 'permission', permission))
            FILTER (WHERE table_id IS NOT NULL) as access
        FROM all_collaborators
        WHERE user_id != $1::text
        GROUP BY user_id
      )
      SELECT u.id, u.name, u.email, u.avatar, uc.status, uc.access
      FROM users u
      JOIN unique_collaborators uc ON u.id::text = uc.user_id
    `, [user.id]);
    const teammates = result.rows.map((u) => ({
      ...u,
      avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff&bold=true`,
    }));
    return NextResponse.json(teammates);
  } catch (err) {
    console.error('Error fetching teammates:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
