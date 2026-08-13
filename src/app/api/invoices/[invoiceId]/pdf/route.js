import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { invoiceVisibleTo, invoiceWorkspaceAccess } from "../../../_lib/invoiceRegistry";

export const runtime = "nodejs";
export async function GET(req,{params}){
 const user=getAuthenticatedUser(req);if(!user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});const{invoiceId}=await params;
 const invoice=(await pool.query("SELECT * FROM invoices WHERE id=$1",[invoiceId])).rows[0];if(!invoice?.pdf_file_id)return NextResponse.json({error:"PDF not found"},{status:404});
 const access=await invoiceWorkspaceAccess(pool,user.id,invoice.workspace_id,"viewer");if(!access||!invoiceVisibleTo(access,invoice))return NextResponse.json({error:"PDF not found"},{status:404});
 const file=(await pool.query("SELECT * FROM uploaded_files WHERE id=$1 AND workspace_id=$2",[invoice.pdf_file_id,invoice.workspace_id])).rows[0];if(!file)return NextResponse.json({error:"PDF not found"},{status:404});
 let data=null;
 if(file.storage_provider==="supabase"){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)return NextResponse.json({error:"Storage unavailable"},{status:503});
  const stored=await createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from(file.storage_bucket).download(file.object_path);
  if(stored.error||!stored.data)return NextResponse.json({error:"PDF unavailable"},{status:503});
  data=Buffer.from(await stored.data.arrayBuffer());
 }else data=file.data?Buffer.from(file.data):file.storage_path?await fs.readFile(file.storage_path):null;
 if(!data||data.subarray(0,5).toString()!=="%PDF-")return NextResponse.json({error:"PDF unavailable"},{status:404});
 const name=`${String(invoice.invoice_number||"invoice").replace(/[^a-z0-9-_]/gi,"_")}.pdf`;
 return new Response(data,{headers:{"Content-Type":"application/pdf","Content-Length":String(data.length),"Content-Disposition":`attachment; filename="${name}"`,"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"}})
}
