import { randomUUID } from "node:crypto";
import { requireWorkspacePermission } from "./authorization";

export const INVOICE_STATUSES = new Set(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]);

export async function invoiceWorkspaceAccess(pool, userId, workspaceId, required = "viewer") {
  const workspace = await requireWorkspacePermission(pool, userId, workspaceId, required);
  if (!workspace) return null;
  const member = (await pool.query(
    "SELECT company_id,portal_type,workspace_role,role FROM workspace_members WHERE workspace_id=$1 AND user_id::text=$2::text LIMIT 1",
    [workspaceId, String(userId)],
  )).rows[0] || null;
  return { workspace, member };
}

export function clientRestricted(access) {
  return String(access?.member?.portal_type || "").toLowerCase() === "client";
}

export function invoiceVisibleTo(access, invoice) {
  if (!clientRestricted(access)) return true;
  return Boolean(access.member.company_id) && String(access.member.company_id) === String(invoice.client_id || "");
}

export function normalizeInvoiceInput(body) {
  const items = Array.isArray(body?.items) ? body.items.slice(0, 250).map((item) => ({
    description: String(item?.description || "").trim().slice(0, 500),
    quantity: Number(item?.quantity || 0),
    unitPrice: Number(item?.unitPrice || 0),
    amount: Number(item?.amount || 0),
  })).filter((item) => item.description && Number.isFinite(item.amount)) : [];
  const subtotal = Number(Number(body?.subtotal || 0).toFixed(2));
  const taxRate = Number(Number(body?.taxRate ?? body?.taxPercent ?? 0).toFixed(4));
  const taxAmount = Number(Number(body?.taxAmount ?? subtotal * taxRate / 100).toFixed(2));
  const total = Number(Number(body?.total ?? subtotal + taxAmount).toFixed(2));
  return {
    clientId: body?.clientId ? String(body.clientId) : null,
    clientName: String(body?.clientName || body?.billTo || "").trim().slice(0, 250),
    issueDate: String(body?.issueDate || "").slice(0, 10),
    dueDate: String(body?.dueDate || "").slice(0, 10),
    currency: String(body?.currency || "EUR").toUpperCase().slice(0, 3),
    subtotal, taxRate, taxAmount, total, items,
    notes: Array.isArray(body?.notes || body?.assumptions) ? (body.notes || body.assumptions).join("\n").slice(0, 4000) : String(body?.notes || "").slice(0, 4000),
    branding: body?.branding && typeof body.branding === "object" ? body.branding : {},
    sourceRefs: body?.sourceRefs && typeof body.sourceRefs === "object" ? body.sourceRefs : {},
  };
}

export async function createInvoice(pool, userId, workspaceId, input) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const year = Number(input.issueDate.slice(0, 4));
    const sequence = (await client.query(`INSERT INTO invoice_sequences(workspace_id,invoice_year,last_number) VALUES($1,$2,1)
      ON CONFLICT(workspace_id,invoice_year) DO UPDATE SET last_number=invoice_sequences.last_number+1 RETURNING last_number`, [workspaceId, year])).rows[0].last_number;
    const number = `INV-${year}-${String(sequence).padStart(4, "0")}`;
    const id = randomUUID();
    const row = (await client.query(`INSERT INTO invoices
      (id,workspace_id,invoice_number,client_id,client_name,issue_date,due_date,currency,subtotal,tax_rate,tax_amount,total,notes,line_items,branding,source_refs,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17) RETURNING *`,
      [id, workspaceId, number, input.clientId, input.clientName, input.issueDate, input.dueDate, input.currency, input.subtotal, input.taxRate, input.taxAmount, input.total, input.notes, JSON.stringify(input.items), JSON.stringify(input.branding), JSON.stringify(input.sourceRefs), String(userId)])).rows[0];
    await client.query("COMMIT");
    return row;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export function effectiveStatus(invoice) {
  if (["PAID", "CANCELLED"].includes(invoice.status)) return invoice.status;
  return new Date(`${invoice.due_date}T23:59:59Z`) < new Date() ? "OVERDUE" : invoice.status;
}
