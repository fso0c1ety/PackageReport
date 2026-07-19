import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { requireWritableSubscription } from "../../../_lib/billing";

export const runtime = "nodejs";

async function ensureBrandingColumns() {
  await pool.query(`
    ALTER TABLE tables
      ADD COLUMN IF NOT EXISTS invoice_logo_url TEXT,
      ADD COLUMN IF NOT EXISTS invoice_stamp_url TEXT
  `);
}

async function getAccessibleTable(tableId, userId) {
  const result = await pool.query(
    `SELECT t.id, t.invoice_logo_url, t.invoice_stamp_url, w.owner_id AS workspace_owner_id
     FROM tables t
     JOIN workspaces w ON w.id = t.workspace_id
     WHERE t.id = $1
       AND (
         w.owner_id = $2
         OR EXISTS (
           SELECT 1 FROM jsonb_array_elements(COALESCE(t.shared_users, '[]'::jsonb)) elem
           WHERE elem->>'userId' = $2
         )
       )`,
    [tableId, userId]
  );
  return result.rows[0] || null;
}

export async function GET(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { tableId } = await params;
    await ensureBrandingColumns();
    const table = await getAccessibleTable(tableId, user.id);
    if (!table) return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    return NextResponse.json({ logoUrl: table.invoice_logo_url || null, stampUrl: table.invoice_stamp_url || null });
  } catch (error) {
    console.error("[INVOICE BRANDING][GET]", error);
    return NextResponse.json({ error: "Unable to load invoice branding" }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { tableId } = await params;
    const billingError = await requireWritableSubscription(user.id, { tableId });
    if (billingError) return billingError;
    await ensureBrandingColumns();
    const table = await getAccessibleTable(tableId, user.id);
    if (!table) return NextResponse.json({ error: "Table not found or forbidden" }, { status: 404 });
    const body = await req.json();
    const logoUrl = body.logoUrl === undefined ? table.invoice_logo_url : (body.logoUrl || null);
    const stampUrl = body.stampUrl === undefined ? table.invoice_stamp_url : (body.stampUrl || null);
    await pool.query(
      "UPDATE tables SET invoice_logo_url = $1, invoice_stamp_url = $2 WHERE id = $3",
      [logoUrl, stampUrl, tableId]
    );
    return NextResponse.json({ logoUrl, stampUrl });
  } catch (error) {
    console.error("[INVOICE BRANDING][PATCH]", error);
    return NextResponse.json({ error: "Unable to save invoice branding" }, { status: 500 });
  }
}
