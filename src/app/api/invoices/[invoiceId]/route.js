import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { INVOICE_STATUSES, clientRestricted, effectiveStatus, invoiceVisibleTo, invoiceWorkspaceAccess } from "../../_lib/invoiceRegistry";

async function load(id) { return (await pool.query("SELECT i.*,u.name AS created_by_name FROM invoices i LEFT JOIN public.users u ON u.id::text=i.created_by::text WHERE i.id=$1", [id])).rows[0]; }

export async function GET(req, { params }) {
  const user=getAuthenticatedUser(req); if(!user?.id)return NextResponse.json({error:"Unauthorized"},{status:401}); const {invoiceId}=await params;
  const invoice=await load(invoiceId); if(!invoice)return NextResponse.json({error:"Not found"},{status:404});
  const access=await invoiceWorkspaceAccess(pool,user.id,invoice.workspace_id,"viewer"); if(!access||!invoiceVisibleTo(access,invoice))return NextResponse.json({error:"Not found"},{status:404});
  return NextResponse.json({invoice:{...invoice,status:effectiveStatus(invoice)}});
}

export async function PATCH(req,{params}) {
  const user=getAuthenticatedUser(req); if(!user?.id)return NextResponse.json({error:"Unauthorized"},{status:401}); const {invoiceId}=await params;
  const invoice=await load(invoiceId); if(!invoice)return NextResponse.json({error:"Not found"},{status:404});
  const access=await invoiceWorkspaceAccess(pool,user.id,invoice.workspace_id,"member"); if(!access||clientRestricted(access))return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await req.json();
  if(body.status){const status=String(body.status).toUpperCase();if(!INVOICE_STATUSES.has(status))return NextResponse.json({error:"Invalid status"},{status:400});await pool.query("UPDATE invoices SET status=$1,updated_at=NOW() WHERE id=$2",[status,invoiceId]);}
  if(body.pdfFileId){const file=(await pool.query("SELECT id FROM uploaded_files WHERE id=$1 AND workspace_id=$2 AND uploaded_by::text=$3::text AND mimetype='application/pdf'",[String(body.pdfFileId),invoice.workspace_id,String(user.id)])).rows[0];if(!file)return NextResponse.json({error:"Invalid PDF file"},{status:400});await pool.query("UPDATE invoices SET pdf_file_id=$1,updated_at=NOW() WHERE id=$2",[file.id,invoiceId]);}
  const updated=await load(invoiceId); return NextResponse.json({invoice:{...updated,status:effectiveStatus(updated)}});
}
