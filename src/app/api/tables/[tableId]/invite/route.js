import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  ensureUserNotificationColumns,
  getAuthenticatedUser,
  pool,
} from "../../../_lib/server";
import { sendPushNotification } from "../../../_lib/firebaseAdmin";
import { requireWritableSubscription } from "../../../_lib/billing";
import { writeAuditLog } from "../../../_lib/audit";
import { broadcastNotificationCreated } from "../../../_lib/notificationRealtime";
import { legacyPermissionForBoardRole, normalizeBoardRole, normalizeJobRoles, normalizePortalType, normalizeRecordAccess, normalizeWorkspaceRole } from "../../../_lib/universalRoles";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tableId } = await params;
    const billingError = await requireWritableSubscription(user.id, { tableId });
    if (billingError) return billingError;
    const body = await req.json();

    // Support both keys used across the app/history.
    const recipientId = body?.recipientId || body?.userId;
    const boardRole = normalizeBoardRole(body?.boardRole || body?.role || "viewer");
    const permission = legacyPermissionForBoardRole(boardRole);
    const workspaceRole = normalizeWorkspaceRole(body?.workspaceRole || (body?.role === "admin" ? "admin" : "member"));
    const jobRoles = normalizeJobRoles(body?.jobRoles || (["driver", "client"].includes(body?.role) ? [body.role] : []));
    const portalType = normalizePortalType(body?.portalType || (jobRoles.includes("driver") ? "driver" : "standard"));
    const recordAccess = normalizeRecordAccess(body?.recordAccess || (jobRoles.includes("driver") ? { scope: "assigned_to_me", field: "assignedDriverUserId" } : { scope: "all_permitted" }));

    if (!recipientId) {
      return NextResponse.json({ error: "Recipient ID is required" }, { status: 400 });
    }

    const recipientRes = await pool.query("SELECT id, email FROM users WHERE id::text=$1::text LIMIT 1", [String(recipientId)]);
    const recipient = recipientRes.rows[0];
    if (!recipient) return NextResponse.json({ error: "Recipient account not found" }, { status: 404 });
    if (body?.recipientEmail && String(body.recipientEmail).trim().toLowerCase() !== String(recipient.email || "").trim().toLowerCase()) {
      return NextResponse.json({ error: "Recipient identity does not match the selected account" }, { status: 400 });
    }

    const tableRes = await pool.query(
      `
        SELECT t.id, t.name, t.workspace_id, w.owner_id,
          CASE WHEN w.owner_id::text=$2::text THEN 'owner'
            WHEN COALESCE(wm.workspace_role,wm.role) IS NOT NULL THEN LOWER(COALESCE(wm.workspace_role,wm.role))
            ELSE NULL END AS inviter_workspace_role,
          CASE WHEN w.owner_id::text=$2::text THEN 'owner'
            ELSE LOWER(COALESCE(shared.member->>'boardRole',shared.member->>'role',shared.member->>'permission','')) END AS inviter_board_role
        FROM tables t
        JOIN workspaces w ON w.id = t.workspace_id
        LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$2::text
        LEFT JOIN LATERAL (
          SELECT member FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END
          ) member WHERE member->>'userId'=$2::text LIMIT 1
        ) shared ON TRUE
        WHERE t.id = $1
          AND (
            w.owner_id = $2
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(COALESCE(t.shared_users, '[]'::jsonb)) AS member
              WHERE member->>'userId' = $2
                AND (
                  member->>'role' = 'admin'
                  OR (member->>'role' IS NULL AND member->>'permission' = 'admin')
                )
            )
          )
        LIMIT 1
      `,
      [tableId, String(user.id)]
    );

    if (!tableRes.rows[0]) {
      return NextResponse.json({ error: "Only owners and admins can invite members" }, { status: 403 });
    }

    const tableName = tableRes.rows[0].name;
    const workspaceId = tableRes.rows[0].workspace_id;

    const workspaceRank = { guest: 10, member: 20, manager: 30, admin: 40, owner: 50 };
    const boardRank = { viewer: 10, commenter: 20, editor: 30, owner: 40, admin: 40 };
    const inviterWorkspaceRole = String(tableRes.rows[0].inviter_workspace_role || "").toLowerCase();
    const inviterBoardRole = String(tableRes.rows[0].inviter_board_role || "").toLowerCase();
    if ((workspaceRank[inviterWorkspaceRole] || 0) < (workspaceRank[workspaceRole] || 0)) {
      return NextResponse.json({ error: "Inviter cannot grant that workspace role" }, { status: 403 });
    }
    if ((boardRank[inviterBoardRole] || 0) < (boardRank[boardRole] || 0)) {
      return NextResponse.json({ error: "Inviter cannot grant that board role" }, { status: 403 });
    }
    const professionalScopes = {
      driver: "assigned_to_me", doctor: "assigned_to_me", teacher: "assigned_to_me",
      parent: "assigned_to_me", patient: "assigned_to_me", client: "my_company",
    };
    const requiredScope = professionalScopes[portalType];
    if (requiredScope && recordAccess.scope !== requiredScope) {
      return NextResponse.json({ error: "Record access exceeds the selected professional portal" }, { status: 403 });
    }
    const notifId = uuidv4();
    const invitationId = uuidv4();

    const existing = await pool.query(
      `SELECT id FROM professional_invitations
       WHERE workspace_id=$1 AND table_id=$2 AND inviter_id=$3 AND recipient_id=$4 AND status='pending'
       LIMIT 1`,
      [workspaceId, tableId, String(user.id), String(recipientId)]
    );
    if (existing.rows[0]) {
      return NextResponse.json({ error: "An invitation is already pending" }, { status: 409 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO professional_invitations
         (id,workspace_id,table_id,inviter_id,recipient_id,workspace_role,board_role,job_roles,portal_type,record_access,notification_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11)`,
        [invitationId, workspaceId, tableId, String(user.id), String(recipientId), workspaceRole, boardRole,
          JSON.stringify(jobRoles), portalType, JSON.stringify(recordAccess), notifId]
      );
      await client.query(
        `INSERT INTO notifications (id, recipient_id, sender_id, type, data, read, created_at)
         VALUES ($1, $2, $3, 'invite', $4::jsonb, FALSE, NOW())`,
        [notifId, recipientId, user.id,
          JSON.stringify({ invitationId, tableId, tableName, workspaceId, permission, boardRole, workspaceRole, jobRoles, portalType, recordAccess })]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    await broadcastNotificationCreated(recipientId, notifId);

    await writeAuditLog({
      actorId: user.id,
      action: "member.invited",
      entityType: "member",
      entityId: String(recipientId),
      tableId,
      workspaceId,
      metadata: { workspaceRole, jobRoles, portalType, recordAccess, boardRole, permission, tableName },
    });

    // Push notification (best-effort).
    try {
      await ensureUserNotificationColumns();

      const recipientRes = await pool.query(
        `
          SELECT
            fcm_token,
            fcm_tokens,
            COALESCE(push_notifications, TRUE) AS push_notifications
          FROM users
          WHERE id = $1
        `,
        [recipientId]
      );
      const senderRes = await pool.query("SELECT name FROM users WHERE id = $1", [user.id]);

      const senderName = senderRes.rows[0]?.name || "Someone";
      const tokenSet = new Set();
      const row = recipientRes.rows[0];

      if (row?.push_notifications !== false && row?.fcm_token) tokenSet.add(row.fcm_token);
      if (row?.push_notifications !== false && Array.isArray(row?.fcm_tokens)) {
        row.fcm_tokens.forEach((t) => {
          if (t) tokenSet.add(t);
        });
      }

      const tokens = Array.from(tokenSet);
      if (tokens.length > 0) {
        await sendPushNotification(
          tokens,
          "Table Invite",
          `${senderName} requests you to share this table: ${tableName}`,
          { type: "invite", notificationId: notifId, tableId, permission, role: boardRole, workspaceRole, portalType }
        );
      }
    } catch (pushErr) {
      console.error("[TABLE INVITE][POST] Push notify failed:", pushErr);
    }

    return NextResponse.json({ success: true, message: "Invite sent" });
  } catch (err) {
    console.error("[TABLE INVITE][POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
