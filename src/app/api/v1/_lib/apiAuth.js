import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "../../_lib/server";
import { rateLimit } from "../../_lib/security";

const hash = (value) => createHash("sha256").update(value).digest("hex");

export async function authenticateApiRequest(req) {
  const key = req.headers.get("x-api-key");
  if (!key) return { error: NextResponse.json({ error: "Missing x-api-key" }, { status: 401 }) };
  const keyHash = hash(key);
  const limit = rateLimit(`public-api:${keyHash}`, 120, 60_000);
  if (!limit.allowed) return { error: NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }) };
  const auth = await pool.query("SELECT id,user_id FROM api_keys WHERE key_hash=$1 AND revoked_at IS NULL", [keyHash]);
  if (!auth.rows[0]) return { error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  await pool.query("UPDATE api_keys SET last_used_at=NOW() WHERE id=$1", [auth.rows[0].id]);
  return { userId: String(auth.rows[0].user_id) };
}

export function pagination(req, maximum = 200) {
  const url = new URL(req.url);
  const limit = Math.min(maximum, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "50", 10) || 50));
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  return { limit, offset };
}

export function paginated(data, limit, offset) {
  return NextResponse.json({ data, pagination: { limit, offset, nextOffset: data.length === limit ? offset + limit : null } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function ownerCanAccessBoard(boardId, userId) {
  const result = await pool.query("SELECT t.id FROM tables t JOIN workspaces w ON w.id=t.workspace_id WHERE t.id=$1 AND w.owner_id=$2 LIMIT 1", [boardId, userId]);
  return Boolean(result.rowCount);
}
