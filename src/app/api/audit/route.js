import { NextResponse } from "next/server";
import { ensureEnterpriseAuditSchema } from "../_lib/audit";
import { getAuthenticatedUser, pool } from "../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const action = String(url.searchParams.get("action") || "").trim();
    const workspaceId = String(url.searchParams.get("workspaceId") || "").trim();
    await ensureEnterpriseAuditSchema();
    const result = await pool.query(`
      SELECT l.id, l.action, l.entity_type, l.entity_id, l.table_id, l.workspace_id,
             l.metadata, l.created_at, u.name AS actor_name, u.email AS actor_email,
             t.name AS table_name, w.name AS workspace_name
      FROM enterprise_audit_logs l
      LEFT JOIN users u ON u.id::text = l.actor_id
      LEFT JOIN tables t ON t.id = l.table_id
      LEFT JOIN workspaces w ON w.id = COALESCE(l.workspace_id, t.workspace_id)
      WHERE EXISTS (
        SELECT 1 FROM workspaces owned
        WHERE owned.owner_id = $1
          AND owned.id = COALESCE(l.workspace_id, t.workspace_id)
      )
      AND ($2 = '' OR l.action = $2)
      AND ($3 = '' OR COALESCE(l.workspace_id, t.workspace_id) = $3)
      ORDER BY l.created_at DESC
      LIMIT 100
    `, [String(user.id), action, workspaceId]);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("[AUDIT][GET] Error:", error);
    return NextResponse.json({ error: "Unable to load audit log" }, { status: 500 });
  }
}
