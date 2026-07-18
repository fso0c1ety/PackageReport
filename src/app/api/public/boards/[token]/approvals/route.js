import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "../../../../_lib/server";
import { rateLimit, requestIp } from "../../../../_lib/security";
import { ensurePublicShareSecuritySchema, hasPublicShareUnlock } from "../../../../_lib/publicShareSecurity";

async function ensureSchema() {
  await pool.query("ALTER TABLE tables ADD COLUMN IF NOT EXISTS public_share_approvals BOOLEAN NOT NULL DEFAULT FALSE");
  await pool.query(`CREATE TABLE IF NOT EXISTS portal_approvals(
    id TEXT PRIMARY KEY, table_id TEXT NOT NULL, row_id TEXT NOT NULL,
    client_name TEXT NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('approved','changes_requested')),
    note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}

async function loadBoard(token) {
  await ensurePublicShareSecuritySchema(pool);
  await ensureSchema();
  const result = await pool.query("SELECT id,public_share_approvals,public_share_password_hash,public_share_expires_at FROM tables WHERE public_share_enabled=TRUE AND public_share_token=$1", [token]);
  return result.rows[0];
}

function deny(req, token, board) {
  if (!board) return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  if (board.public_share_expires_at && new Date(board.public_share_expires_at) <= new Date()) return NextResponse.json({ error: "Expired" }, { status: 410 });
  if (board.public_share_password_hash && !hasPublicShareUnlock(req, token)) return NextResponse.json({ error: "Password required" }, { status: 401 });
  if (!board.public_share_approvals) return NextResponse.json({ error: "Approvals disabled" }, { status: 403 });
  return null;
}

export async function GET(req, { params }) {
  const { token } = await params;
  const board = await loadBoard(token);
  const denied = deny(req, token, board);
  if (denied) return denied;
  const result = await pool.query(`SELECT DISTINCT ON (row_id) id,row_id,client_name,decision,note,created_at
    FROM portal_approvals WHERE table_id=$1 ORDER BY row_id,created_at DESC`, [board.id]);
  return NextResponse.json(result.rows);
}

export async function POST(req, { params }) {
  const { token } = await params;
  const limit = rateLimit(`portal-approval:${token}:${requestIp(req)}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const board = await loadBoard(token);
  const denied = deny(req, token, board);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const rowId = String(body.rowId || "").trim();
  const clientName = String(body.name || "").trim().slice(0, 80);
  const decision = body.decision === "changes_requested" ? "changes_requested" : body.decision === "approved" ? "approved" : "";
  const note = String(body.note || "").trim().slice(0, 1000);
  if (!rowId || !clientName || !decision) return NextResponse.json({ error: "Record, name and decision are required" }, { status: 400 });
  const exists = await pool.query("SELECT 1 FROM rows WHERE id=$1 AND table_id=$2", [rowId, board.id]);
  if (!exists.rowCount) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  const record = { id: randomUUID(), tableId: board.id, rowId, clientName, decision, note: note || null };
  await pool.query("INSERT INTO portal_approvals(id,table_id,row_id,client_name,decision,note) VALUES($1,$2,$3,$4,$5,$6)", Object.values(record));
  return NextResponse.json({ success: true }, { status: 201 });
}
