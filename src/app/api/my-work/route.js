import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";
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
  const result=await pool.query(`WITH accessible AS (
    SELECT DISTINCT t.id,t.name,t.workspace_id,t.columns FROM tables t JOIN workspaces w ON w.id=t.workspace_id
    WHERE w.owner_id=$1 OR EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(t.shared_users,'[]'::jsonb)) m WHERE m->>'userId'=$1)
  ) SELECT r.id,r.values,r.created_at,a.id table_id,a.name board_name,a.workspace_id,a.columns
    FROM rows r JOIN accessible a ON a.id=r.table_id
    WHERE r.created_by=$1 OR r.values::text ILIKE $2
    ORDER BY r.created_at DESC LIMIT 100`,[String(user.id),`%${String(user.email||user.id)}%`]);
  const notificationCounts=await pool.query(`SELECT
    COUNT(*) FILTER (WHERE read=FALSE AND type='mention')::int mentions,
    COUNT(*) FILTER (WHERE read=FALSE AND type IN ('comment','chat'))::int unread_comments,
    COUNT(*) FILTER (WHERE read=FALSE AND (type='approval' OR data->>'status'='pending'))::int pending_approvals
    FROM notifications WHERE recipient_id=$1`,[String(user.id)]).catch(()=>({rows:[{}]}));
  const recentActivity=await pool.query(`SELECT COUNT(*)::int count FROM activity_logs log
    WHERE log.timestamp >= NOW()-INTERVAL '7 days' AND EXISTS(
      SELECT 1 FROM tables t JOIN workspaces w ON w.id=t.workspace_id
      WHERE t.id=log.table_id AND (w.owner_id=$1 OR EXISTS(
        SELECT 1 FROM jsonb_array_elements(COALESCE(t.shared_users,'[]'::jsonb)) m WHERE m->>'userId'=$1
      ))
    )`,[String(user.id)]).catch(()=>({rows:[{count:0}]}));
  const counts=notificationCounts.rows[0]||{};
  const items=result.rows.map(classify).filter(item=>!item.completed).map(({completed:_,...item})=>item);return NextResponse.json({items,summary:{assigned:items.length,overdue:items.filter(i=>i.bucket==="overdue").length,upcoming:items.filter(i=>i.bucket==="upcoming").length,mentions:counts.mentions||0,unreadComments:counts.unread_comments||0,pendingApprovals:counts.pending_approvals||0,recentActivity:recentActivity.rows[0]?.count||0}},{headers:{"Cache-Control":"private, no-store, max-age=0"}});
}
