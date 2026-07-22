import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { ensureLogisticsSchema, logisticsAccess } from "../../_lib/logistics";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  if (!workspaceId) {
    await ensureLogisticsSchema();
    const result = await pool.query(`
      SELECT w.id,w.name,wm.settings
      FROM workspace_members wm
      JOIN workspaces w ON w.id=wm.workspace_id
      WHERE wm.user_id=$1 AND wm.role='driver'
        AND w.template_key=ANY($2)
      ORDER BY wm.updated_at DESC NULLS LAST,wm.created_at DESC
      LIMIT 1
    `, [String(user.id), ["freight_broker", "fleet_management"]]);
    const workspace = result.rows[0] || null;
    return NextResponse.json({ logistics: Boolean(workspace), role: workspace ? "driver" : null, driver: Boolean(workspace), workspace: workspace ? { id: workspace.id, name: workspace.name } : null, settings: workspace?.settings || {} });
  }
  const access = await logisticsAccess(workspaceId, user.id);
  return NextResponse.json({ logistics: Boolean(access), role: access?.role || null, driver: access?.role === "driver", settings: access?.settings || {} });
}
