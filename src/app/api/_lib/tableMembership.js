import {
  legacyPermissionForBoardRole,
  normalizeBoardRole,
  normalizeJobRoles,
  normalizePortalType,
  normalizeRecordAccess,
  normalizeWorkspaceRole,
  PORTAL_ROUTES,
} from "./universalRoles";

function memberId(entry) {
  return String(entry?.userId || entry?.id || entry || "");
}

export async function upsertTableMembership(client, table, userId, input = {}) {
  const normalizedUserId = String(userId);
  const boardRole = normalizeBoardRole(input.boardRole || input.role || input.permission || "editor");
  const permission = legacyPermissionForBoardRole(boardRole);
  const workspaceRole = normalizeWorkspaceRole(input.workspaceRole || "member");
  const jobRoles = normalizeJobRoles(input.jobRoles);
  const portalType = normalizePortalType(input.portalType || "standard");
  const recordAccess = normalizeRecordAccess(input.recordAccess || { scope: "all_permitted" });
  const existingSharedUsers = Array.isArray(table.shared_users) ? table.shared_users : [];
  const alreadyShared = existingSharedUsers.some((entry) => memberId(entry) === normalizedUserId);

  if (alreadyShared && input.preserveExisting) {
    return { alreadyShared, boardRole, permission, workspaceRole, jobRoles, portalType, recordAccess };
  }

  if (!alreadyShared) {
    const sharedUsers = existingSharedUsers.filter((entry) => memberId(entry) !== normalizedUserId);
    sharedUsers.push({
      userId: normalizedUserId,
      permission,
      role: boardRole,
      boardRole,
      workspaceRole,
      jobRoles,
      jobRole: jobRoles[0] || null,
      portalType,
      landingRoute: PORTAL_ROUTES[portalType],
      recordAccess,
    });
    await client.query("UPDATE tables SET shared_users=$1::jsonb WHERE id=$2", [JSON.stringify(sharedUsers), table.id]);
  }

  const schema = await client.query(`SELECT
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='portal_type') AS has_portal_type,
    to_regclass('public.board_member_access') IS NOT NULL AS has_board_member_access`);
  const hasUniversalMembership = Boolean(schema.rows[0]?.has_portal_type);
  const hasBoardMemberAccess = Boolean(schema.rows[0]?.has_board_member_access);

  if (hasUniversalMembership) {
    const universalConflict = input.preserveExisting
      ? "ON CONFLICT(workspace_id,user_id) DO NOTHING"
      : `ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=EXCLUDED.role,workspace_role=EXCLUDED.workspace_role,
        job_roles=EXCLUDED.job_roles,portal_type=EXCLUDED.portal_type,landing_route=EXCLUDED.landing_route,
        record_access=EXCLUDED.record_access,updated_at=NOW()`;
    await client.query(`INSERT INTO workspace_members(workspace_id,user_id,role,workspace_role,job_roles,portal_type,landing_route,record_access,updated_at)
      VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,NOW()) ${universalConflict}`, [
      table.workspace_id, normalizedUserId, jobRoles.includes("driver") ? "driver" : workspaceRole,
      workspaceRole, JSON.stringify(jobRoles), portalType, PORTAL_ROUTES[portalType], JSON.stringify(recordAccess),
    ]);
  } else {
    const legacyConflict = input.preserveExisting
      ? "ON CONFLICT(workspace_id,user_id) DO NOTHING"
      : "ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=EXCLUDED.role,updated_at=NOW()";
    await client.query(`INSERT INTO workspace_members(workspace_id,user_id,role,updated_at)
      VALUES($1,$2,$3,NOW()) ${legacyConflict}`,
    [table.workspace_id, normalizedUserId, jobRoles.includes("driver") ? "driver" : workspaceRole]);
  }

  if (hasBoardMemberAccess) {
    await client.query(`INSERT INTO board_member_access(table_id,user_id,board_role,capabilities,record_access,updated_at)
      VALUES($1,$2,$3,'{}'::jsonb,$4::jsonb,NOW())
      ON CONFLICT(table_id,user_id) DO UPDATE SET board_role=CASE
        WHEN board_member_access.board_role='owner' THEN board_member_access.board_role
        ELSE EXCLUDED.board_role END,
      record_access=EXCLUDED.record_access,updated_at=NOW()`,
    [table.id, normalizedUserId, boardRole, JSON.stringify(recordAccess)]);
  }

  return { alreadyShared, boardRole, permission, workspaceRole, jobRoles, portalType, recordAccess };
}
