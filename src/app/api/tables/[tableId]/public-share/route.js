import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { writeAuditLog } from "../../../_lib/audit";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { hashPublicSharePassword } from "../../../_lib/publicShareSecurity";

export const runtime = "nodejs";

async function ensureColumns() {
  await pool.query(`ALTER TABLE tables
    ADD COLUMN IF NOT EXISTS public_share_token TEXT,
    ADD COLUMN IF NOT EXISTS public_share_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS public_share_title TEXT,
    ADD COLUMN IF NOT EXISTS public_share_welcome TEXT,
    ADD COLUMN IF NOT EXISTS public_share_comments BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS public_share_password_hash TEXT,
    ADD COLUMN IF NOT EXISTS public_share_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS public_share_downloads BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS public_share_approvals BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_public_share_token ON tables(public_share_token) WHERE public_share_token IS NOT NULL");
}

async function getManageableTable(tableId, userId) {
  const result = await pool.query(`
    SELECT t.id, t.name, t.workspace_id, t.public_share_token, t.public_share_enabled, t.public_share_title, t.public_share_welcome, t.public_share_comments,
      t.public_share_password_hash, t.public_share_expires_at, t.public_share_downloads, t.public_share_approvals
    FROM tables t JOIN workspaces w ON w.id=t.workspace_id
    WHERE t.id=$1 AND (w.owner_id=$2 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(t.shared_users,'[]'::jsonb)) member
      WHERE member->>'userId'=$2 AND (member->>'role'='admin' OR (member->>'role' IS NULL AND member->>'permission'='admin'))
    )) LIMIT 1`, [tableId, String(userId)]);
  return result.rows[0];
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureColumns();
  const { tableId } = await params;
  const table = await getManageableTable(tableId, user.id);
  if (!table) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ enabled: table.public_share_enabled, token: table.public_share_enabled ? table.public_share_token : null, title:table.public_share_title, welcome:table.public_share_welcome, allowComments:table.public_share_comments, passwordProtected:Boolean(table.public_share_password_hash), expiresAt:table.public_share_expires_at, allowDownloads:table.public_share_downloads, allowApprovals:table.public_share_approvals });
}

export async function POST(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureColumns();
  const { tableId } = await params;
  const table = await getManageableTable(tableId, user.id);
  if (!table) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const token = table.public_share_token || randomBytes(24).toString("base64url");
  const body=await req.json().catch(()=>({}));
  const password = String(body.password || "");
  if (password && password.length < 8) return NextResponse.json({ error:"Share password must contain at least 8 characters" }, { status:400 });
  const passwordHash = password ? await hashPublicSharePassword(password) : (body.removePassword ? null : table.public_share_password_hash);
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return NextResponse.json({ error:"Invalid expiration date" }, { status:400 });
  if (expiresAt && expiresAt <= new Date()) return NextResponse.json({ error:"Expiration must be in the future" }, { status:400 });
  await pool.query("UPDATE tables SET public_share_token=$1, public_share_enabled=TRUE, public_share_title=$2, public_share_welcome=$3, public_share_comments=$4, public_share_password_hash=$5, public_share_expires_at=$6, public_share_downloads=$7, public_share_approvals=$8 WHERE id=$9", [token, String(body.title||table.name).slice(0,120), String(body.welcome||"").slice(0,500), Boolean(body.allowComments), passwordHash, expiresAt, Boolean(body.allowDownloads), Boolean(body.allowApprovals), tableId]);
  await writeAuditLog({ actorId:user.id, action:"public_share.enabled", entityType:"table", entityId:tableId, tableId, workspaceId:table.workspace_id });
  return NextResponse.json({ enabled:true, token, passwordProtected:Boolean(passwordHash), expiresAt, allowDownloads:Boolean(body.allowDownloads), allowApprovals:Boolean(body.allowApprovals) });
}

export async function DELETE(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureColumns();
  const { tableId } = await params;
  const table = await getManageableTable(tableId, user.id);
  if (!table) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await pool.query("UPDATE tables SET public_share_enabled=FALSE WHERE id=$1", [tableId]);
  await writeAuditLog({ actorId:user.id, action:"public_share.disabled", entityType:"table", entityId:tableId, tableId, workspaceId:table.workspace_id });
  return NextResponse.json({ enabled:false });
}
