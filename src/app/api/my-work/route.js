import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { rowMatchesRecordAccess } from "../_lib/authorization";
export const runtime="nodejs";
export const dynamic="force-dynamic";

function classify(row){
  const values=row.values&&typeof row.values==="object"?row.values:{};
  const columns=Array.isArray(row.columns)?row.columns:[];
  const dateColumnIds=new Set(columns.filter(column=>["Date","Timeline"].includes(column?.type)).map(column=>String(column.id)));
  const dateValues=Object.entries(values).filter(([id])=>dateColumnIds.has(String(id))).flatMap(([,value])=>{
    if(value&&typeof value==="object"&&!Array.isArray(value))return [value.start,value.end,value.date,value.value].filter(Boolean);
    return Array.isArray(value)?value:[value];
  });
  const dates=dateValues.map(value=>({value,date:new Date(value)})).filter(item=>!Number.isNaN(item.date.getTime())&&item.date.getFullYear()>=2000&&item.date.getFullYear()<=2100);
  const nearest=dates.sort((a,b)=>a.date.getTime()-b.date.getTime())[0];
  const statusColumnIds=new Set(columns.filter(column=>column?.type==="Status").map(column=>String(column.id)));
  const statusText=Object.entries(values).filter(([id])=>statusColumnIds.has(String(id))).map(([,value])=>typeof value==="object"?JSON.stringify(value):String(value??"")).join(" ");
  const completed=/\b(done|completed|delivered|closed|cancelled|canceled)\b|e perfunduar|e anuluar/i.test(statusText);
  const now=Date.now(),week=7*24*60*60*1000;
  const {columns:_,...item}=row;
  return {...item,completed,due_date:nearest?.date.toISOString()||null,bucket:nearest?(nearest.date.getTime()<now?"overdue":nearest.date.getTime()<now+week?"upcoming":"assigned"):"assigned"};
}

export async function GET(req){
  const user=getAuthenticatedUser(req);if(!user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
  const schema=await pool.query(`SELECT
    to_regclass('public.board_member_access') IS NOT NULL AS has_board_access,
    to_regprocedure('smart_manage_row_visible(jsonb,text,text,jsonb,text,jsonb,text,text,text)') IS NOT NULL AS has_row_visibility,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='workspace_role') AS has_workspace_role`);
  const universal=Boolean(schema.rows[0]?.has_board_access&&schema.rows[0]?.has_row_visibility&&schema.rows[0]?.has_workspace_role);
  let result;
  if(universal){result=await pool.query(`WITH accessible AS (
    SELECT DISTINCT t.id,t.name,t.workspace_id,t.columns,
      CASE WHEN w.owner_id::text=$1::text OR COALESCE(wm.workspace_role,wm.role) IN ('owner','admin','logistics_admin') THEN '{"scope":"all_permitted"}'::jsonb ELSE COALESCE(bma.record_access,wm.record_access,'{"scope":"all_permitted"}'::jsonb) END record_access,
      wm.team_id,wm.department_id,wm.company_id
    FROM tables t JOIN workspaces w ON w.id=t.workspace_id
    LEFT JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id::text=$1::text
    LEFT JOIN board_member_access bma ON bma.table_id=t.id AND bma.user_id::text=$1::text
    WHERE w.owner_id::text=$1::text OR bma.user_id IS NOT NULL OR COALESCE(wm.workspace_role,wm.role) IN ('owner','admin','logistics_admin') OR EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(t.shared_users,'[]'::jsonb)) m WHERE m->>'userId'=$1)
  ) SELECT r.id,r.values,r.created_at,a.id table_id,a.name board_name,a.workspace_id,a.columns
    FROM rows r JOIN accessible a ON a.id=r.table_id
    WHERE (r.created_by=$1 OR r.values::text ILIKE $2)
      AND smart_manage_row_visible(r.values,r.id::text,r.created_by::text,a.columns,$1::text,a.record_access,a.team_id,a.department_id,a.company_id)
    ORDER BY r.created_at DESC LIMIT 100`,[String(user.id),`%${String(user.email||user.id)}%`]);}
  else {
    const legacy=await pool.query(`SELECT r.id,r.values,r.created_at,r.created_by,
      t.id table_id,t.name board_name,t.workspace_id,t.columns,w.owner_id workspace_owner_id,
      (SELECT LOWER(COALESCE(member->>'boardRole',member->>'role',member->>'permission','editor'))
       FROM jsonb_array_elements(CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END) member
       WHERE COALESCE(member->>'userId',member#>>'{}')=$1::text LIMIT 1) legacy_shared_role
      FROM rows r JOIN tables t ON t.id=r.table_id JOIN workspaces w ON w.id=t.workspace_id
      WHERE (w.owner_id::text=$1::text OR EXISTS(
        SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(COALESCE(t.shared_users,'[]'::jsonb))='array' THEN COALESCE(t.shared_users,'[]'::jsonb) ELSE '[]'::jsonb END) member
        WHERE COALESCE(member->>'userId',member#>>'{}')=$1::text))
      AND (r.created_by::text=$1::text OR r.values::text ILIKE $2)
      ORDER BY r.created_at DESC LIMIT 100`,[String(user.id),`%${String(user.email||user.id)}%`]);
    result={rows:legacy.rows.filter(row=>rowMatchesRecordAccess(row,{
      ...row,
      board_record_access:row.legacy_shared_role==="driver"?{scope:"assigned_to_me",field:"_assignedDriverUserId"}:{scope:"all_permitted"},
    },user.id))};
  }
  const [notificationCounts,recentActivity]=await Promise.all([
    pool.query(`SELECT
      COUNT(*) FILTER (WHERE read=FALSE AND type='mention')::int mentions,
      COUNT(*) FILTER (WHERE read=FALSE AND type IN ('comment','chat'))::int unread_comments,
      COUNT(*) FILTER (WHERE read=FALSE AND (type='approval' OR data->>'status'='pending'))::int pending_approvals
      FROM notifications WHERE recipient_id=$1`,[String(user.id)]).catch(()=>({rows:[{}]})),
    pool.query(`SELECT COUNT(*)::int count
      FROM activity_logs log
      JOIN tables t ON t.id=log.table_id
      JOIN workspaces w ON w.id=t.workspace_id
      WHERE log.timestamp >= NOW()-INTERVAL '7 days'
        AND (w.owner_id=$1 OR EXISTS(
          SELECT 1 FROM jsonb_array_elements(COALESCE(t.shared_users,'[]'::jsonb)) m WHERE m->>'userId'=$1
        ))`,[String(user.id)]).catch(()=>({rows:[{count:0}]})),
  ]);
  const counts=notificationCounts.rows[0]||{};
  const items=result.rows.map(classify).filter(item=>!item.completed).map(({completed:_,...item})=>item);return NextResponse.json({items,summary:{assigned:items.length,overdue:items.filter(i=>i.bucket==="overdue").length,upcoming:items.filter(i=>i.bucket==="upcoming").length,mentions:counts.mentions||0,unreadComments:counts.unread_comments||0,pendingApprovals:counts.pending_approvals||0,recentActivity:recentActivity.rows[0]?.count||0}},{headers:{"Cache-Control":"private, no-store, max-age=0"}});
}
