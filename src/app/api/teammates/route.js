import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schema = await pool.query(`SELECT
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='portal_type') AS has_portal_type`);
    const membershipProjection = schema.rows[0]?.has_portal_type ? `
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'workspaceId',w.id,'workspaceName',w.name,
            'workspaceRole',COALESCE(wm.workspace_role,wm.role,'member'),
            'jobRoles',COALESCE(wm.job_roles,'[]'::jsonb),
            'portalType',COALESCE(wm.portal_type,'standard'),
            'landingRoute',wm.landing_route,'recordAccess',wm.record_access,
            'navigation',wm.navigation,'allowedActions',wm.allowed_actions
          ))
          FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id
          WHERE wm.user_id::text=u.id::text AND w.owner_id::text=$1::text
        ),'[]'::jsonb) AS memberships` : `
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'workspaceId',w.id,'workspaceName',w.name,
            'workspaceRole',COALESCE(wm.role,'member'),
            'jobRoles',CASE WHEN wm.role='driver' THEN '["driver"]'::jsonb ELSE '[]'::jsonb END,
            'portalType',CASE WHEN wm.role='driver' THEN 'driver' ELSE 'standard' END,
            'landingRoute',CASE WHEN wm.role='driver' THEN '/driver-trips' ELSE '/dashboard' END,
            'recordAccess',CASE WHEN wm.role='driver' THEN '{"scope":"assigned_to_me","field":"assignedDriverUserId"}'::jsonb ELSE '{"scope":"all_permitted"}'::jsonb END
          ))
          FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id
          WHERE wm.user_id::text=u.id::text AND w.owner_id::text=$1::text
        ),'[]'::jsonb) AS memberships`;
    const query = `
      WITH owned_tables AS (
          SELECT t.id, t.name as table_name, t.shared_users, w.id as workspace_id, w.name as workspace_name
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
            ot.workspace_id,
            ot.workspace_name,
            (elem->>'permission') as permission,
            COALESCE(
              elem->>'role',
              CASE
                WHEN elem->>'permission' = 'admin' THEN 'admin'
                WHEN elem->>'permission' = 'read' THEN 'guest'
                ELSE 'employee'
              END
            ) as role,
            elem->'capabilities' as capabilities,
            elem->>'workspaceRole' as workspace_role,
            elem->'jobRoles' as job_roles,
            elem->>'portalType' as portal_type,
            elem->'recordAccess' as record_access
          FROM owned_tables ot
          CROSS JOIN LATERAL jsonb_array_elements(ot.shared_users) AS elem
          UNION ALL
          SELECT
            n.recipient_id::text as user_id,
            'pending' as status,
            NULL as table_id,
            NULL as table_name,
            NULL as workspace_id,
            NULL as workspace_name,
            'edit' as permission,
            'employee' as role,
            NULL::jsonb as capabilities,
            NULL::text as workspace_role,
            NULL::jsonb as job_roles,
            NULL::text as portal_type,
            NULL::jsonb as record_access
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
                'workspaceId', workspace_id,
                'workspaceName', workspace_name,
                'permission', permission,
                'role', role,
                'capabilities', capabilities,
                'workspaceRole', workspace_role,
                'jobRoles', job_roles,
                'portalType', portal_type,
                'recordAccess', record_access
              )
            ) FILTER (WHERE table_id IS NOT NULL) as access
          FROM all_collaborators
          WHERE user_id != $1::text
          GROUP BY user_id
      )
      SELECT u.id, u.name, u.email, u.avatar, uc.status, uc.access,
        ${membershipProjection}
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
