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
 if(file.storage_provider==="supabase"){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE||process.env.SUPABASE_SERVICE_KEY;if(!url||!key)return NextResponse.json({error:"Storage unavailable"},{status:503});const signed=await createClient(url,key,{auth:{persistSession:false}}).storage.from(file.storage_bucket).createSignedUrl(file.object_path,60,{download:file.originalname||`${invoice.invoice_number}.pdf`});if(signed.error||!signed.data?.signedUrl)return NextResponse.json({error:"PDF unavailable"},{status:503});return NextResponse.redirect(signed.data.signedUrl)}
 const data=file.data?Buffer.from(file.data):file.storage_path?await fs.readFile(file.storage_path):null;if(!data)return NextResponse.json({error:"PDF unavailable"},{status:404});
 const name=String(file.originalname||`${invoice.invoice_number}.pdf`).replace(/["\r\n]/g,"_");return new Response(data,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${name}"`,"Cache-Control":"private, no-store"}})
}
