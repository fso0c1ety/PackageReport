import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../_lib/server";
import { clientRestricted, createInvoice, effectiveStatus, invoiceWorkspaceAccess, normalizeInvoiceInput } from "../_lib/invoiceRegistry";

export async function GET(req) {
  const user = getAuthenticatedUser(req); if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url), workspaceId = url.searchParams.get("workspaceId");
  const access = await invoiceWorkspaceAccess(pool, user.id, workspaceId, "viewer"); if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const values = [workspaceId]; let where = "i.workspace_id=$1";
  if (clientRestricted(access)) { values.push(String(access.member.company_id || "")); where += ` AND i.client_id=$${values.length}`; }
  const status = String(url.searchParams.get("status") || "").toUpperCase(); if (status) { values.push(status); where += ` AND i.status=$${values.length}`; }
  const search = String(url.searchParams.get("search") || "").trim(); if (search) { values.push(`%${search}%`); where += ` AND (i.invoice_number ILIKE $${values.length} OR i.client_name ILIKE $${values.length})`; }
  const rows = (await pool.query(`SELECT i.*,u.name AS created_by_name FROM invoices i LEFT JOIN public.users u ON u.id::text=i.created_by::text WHERE ${where} ORDER BY i.created_at DESC LIMIT 500`, values)).rows;
  return NextResponse.json({ invoices: rows.map((row) => ({ ...row, status: effectiveStatus(row) })) });
}

export async function POST(req) {
  const user = getAuthenticatedUser(req); if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json(), workspaceId = String(body?.workspaceId || "");
  const access = await invoiceWorkspaceAccess(pool, user.id, workspaceId, "member"); if (!access || clientRestricted(access)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const input = normalizeInvoiceInput(body); if (!input.clientName || !/^\d{4}-\d{2}-\d{2}$/.test(input.issueDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) || !input.items.length || input.total < 0) return NextResponse.json({ error: "Invalid invoice data" }, { status: 400 });
  const invoice = await createInvoice(pool, user.id, workspaceId, input);
  return NextResponse.json({ invoice: { ...invoice, status: effectiveStatus(invoice) } }, { status: 201 });
}
