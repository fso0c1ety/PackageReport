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
      SELECT DISTINCT t.id, t.name, t.workspace_id
      FROM tables t JOIN workspaces w ON w.id=t.workspace_id
      WHERE w.owner_id=$1 OR EXISTS (
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
      UNION ALL
      SELECT 'user',u.id,u.name,u.email,NULL,NULL,4 FROM users u WHERE u.name ILIKE $2 ESCAPE '\\' OR u.email ILIKE $2 ESCAPE '\\'
    ) SELECT * FROM hits ORDER BY rank,title LIMIT 30
  `, [String(user.id), term]);
  return NextResponse.json({ results: result.rows }, { headers: { "Cache-Control": "private, no-store" } });
}
