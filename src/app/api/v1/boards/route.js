import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "../../_lib/server";
const hash=(value)=>createHash("sha256").update(value).digest("hex");
export async function GET(req){const key=req.headers.get("x-api-key");if(!key)return NextResponse.json({error:"Missing x-api-key"},{status:401});const auth=await pool.query("SELECT id,user_id FROM api_keys WHERE key_hash=$1 AND revoked_at IS NULL",[hash(key)]);if(!auth.rows[0])return NextResponse.json({error:"Invalid API key"},{status:401});await pool.query("UPDATE api_keys SET last_used_at=NOW() WHERE id=$1",[auth.rows[0].id]);const r=await pool.query("SELECT t.id,t.name,t.workspace_id,t.created_at FROM tables t JOIN workspaces w ON w.id=t.workspace_id WHERE w.owner_id=$1 ORDER BY t.created_at DESC",[auth.rows[0].user_id]);return NextResponse.json({data:r.rows})}
