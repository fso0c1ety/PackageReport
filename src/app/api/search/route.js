import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const query = String(new URL(req.url).searchParams.get("q") || "").trim().slice(0, 100);
  if (query.length < 2) return NextResponse.json({ results: [] });
  const term = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const result = await pool.query(`
    WITH accessible AS (
      SELECT DISTINCT t.id, t.name, t.workspace_id, t.columns,
        CASE WHEN w.owner_id::text=$1::text OR COALESCE(wm.workspace_role,wm.role) IN ('owner','admin','logistics_admin')
          THEN '{"scope":"all_permitted"}'::jsonb ELSE COALESCE(bma.record_access,wm.record_access,'{"scope":"all_permitted"}'::jsonb) END record_access,
        wm.team_id,wm.department_id,wm.company_id
      FROM tables t JOIN workspaces w ON w.id=t.workspace_id
      LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$1::text
      LEFT JOIN board_member_access bma ON bma.table_id=t.id AND bma.user_id::text=$1::text
      WHERE w.owner_id::text=$1::text OR bma.user_id IS NOT NULL OR COALESCE(wm.workspace_role,wm.role) IN ('owner','admin','logistics_admin') OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(t.shared_users,'[]'::jsonb)) member
        WHERE member->>'userId'=$1
      )
    ), hits AS (
      SELECT 'workspace' type,w.id,w.name title,'Workspace' subtitle,w.id workspace_id,NULL::text table_id,1 rank
      FROM workspaces w WHERE w.owner_id=$1 AND w.name ILIKE $2 ESCAPE '\\'
      UNION ALL
      SELECT 'board',a.id,a.name,'Board',a.workspace_id,a.id,2 FROM accessible a WHERE a.name ILIKE $2 ESCAPE '\\'
      UNION ALL
      SELECT 'row',r.id,COALESCE(NULLIF(r.values->>'name',''),NULLIF(r.values->>'title',''),'Matching row'),a.name,a.workspace_id,a.id,3
      FROM rows r JOIN accessible a ON a.id=r.table_id WHERE r.values::text ILIKE $2 ESCAPE '\\'
        AND smart_manage_row_visible(r.values,r.id::text,r.created_by::text,a.columns,$1::text,a.record_access,a.team_id,a.department_id,a.company_id)
      UNION ALL
      SELECT 'comment',c.id,LEFT(c.body,120),a.name,a.workspace_id,a.id,4
      FROM item_comments c JOIN rows r ON r.id=c.row_id JOIN accessible a ON a.id=r.table_id
      WHERE c.body ILIKE $2 ESCAPE '\\' AND smart_manage_row_visible(r.values,r.id::text,r.created_by::text,a.columns,$1::text,a.record_access,a.team_id,a.department_id,a.company_id)
      UNION ALL
      SELECT 'file',f.id,COALESCE(NULLIF(f.originalname,''),f.filename),a.name,a.workspace_id,a.id,5
      FROM uploaded_files f JOIN accessible a ON a.id=f.table_id LEFT JOIN rows fr ON fr.id=f.row_id
      WHERE (f.originalname ILIKE $2 ESCAPE '\\' OR f.filename ILIKE $2 ESCAPE '\\')
        AND (f.row_id IS NULL OR smart_manage_row_visible(fr.values,fr.id::text,fr.created_by::text,a.columns,$1::text,a.record_access,a.team_id,a.department_id,a.company_id))
      UNION ALL
      SELECT 'user',u.id,u.name,u.email,NULL,NULL,6 FROM users u WHERE (u.name ILIKE $2 ESCAPE '\\' OR u.email ILIKE $2 ESCAPE '\\') AND EXISTS (
        SELECT 1 FROM workspaces sw WHERE (sw.owner_id::text=$1::text OR EXISTS(SELECT 1 FROM workspace_members sm1 WHERE sm1.workspace_id=sw.id AND sm1.user_id::text=$1::text))
          AND (sw.owner_id::text=u.id::text OR EXISTS(SELECT 1 FROM workspace_members sm2 WHERE sm2.workspace_id=sw.id AND sm2.user_id::text=u.id::text))
      )
    ) SELECT * FROM hits ORDER BY rank,title LIMIT 30
  `, [String(user.id), term]);
  return NextResponse.json({ results: result.rows }, { headers: { "Cache-Control": "private, no-store" } });
}
