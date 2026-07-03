import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const query = `
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
          CROSS JOIN LATERAL jsonb_array_elements(ot.shared_users) AS elem
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
            jsonb_agg(
              jsonb_build_object(
                'tableId', table_id,
                'tableName', table_name,
                'workspaceName', workspace_name,
                'permission', permission
              )
            ) FILTER (WHERE table_id IS NOT NULL) as access
          FROM all_collaborators
          WHERE user_id != $1::text
          GROUP BY user_id
      )
      SELECT u.id, u.name, u.email, u.avatar, uc.status, uc.access
      FROM users u
      JOIN unique_collaborators uc ON u.id::text = uc.user_id
    `;

    const result = await pool.query(query, [user.id]);
    const teammates = result.rows.map((teammate) => ({
      ...teammate,
      avatar:
        teammate.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          teammate.name
        )}&background=random&color=fff&bold=true`,
    }));

    return NextResponse.json(teammates);
  } catch (err) {
    console.error("[TEAMMATES][GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
