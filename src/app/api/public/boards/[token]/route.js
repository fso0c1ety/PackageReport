import { NextResponse } from "next/server";
import { pool } from "../../../_lib/server";
import { ensurePublicShareSecuritySchema, hasPublicShareUnlock, publicShareCookieName, publicShareUnlockValue, verifyPublicSharePassword } from "../../../_lib/publicShareSecurity";

export const runtime = "nodejs";

async function loadBoard(token) {
  await ensurePublicShareSecuritySchema(pool);
  return pool.query(`
    SELECT t.id, t.name, t.columns, t.created_at, t.public_share_title, t.public_share_welcome, t.public_share_comments,
      t.public_share_password_hash, t.public_share_expires_at, t.public_share_downloads,
      COALESCE(jsonb_agg(jsonb_build_object('id',r.id,'values',r.values,'created_at',r.created_at) ORDER BY r.created_at) FILTER (WHERE r.id IS NOT NULL),'[]'::jsonb) rows
    FROM tables t LEFT JOIN rows r ON r.table_id=t.id
    WHERE t.public_share_enabled=TRUE AND t.public_share_token=$1
    GROUP BY t.id`, [token]);
}

function boardResponse(req, token, board) {
  if (!board) return NextResponse.json({ error:"Link unavailable" }, { status:404 });
  if (board.public_share_expires_at && new Date(board.public_share_expires_at) <= new Date()) return NextResponse.json({ error:"This shared link has expired" }, { status:410 });
  if (board.public_share_password_hash && !hasPublicShareUnlock(req, token)) return NextResponse.json({ error:"Password required", passwordRequired:true }, { status:401 });
  const { public_share_password_hash: _secret, ...safeBoard } = board;
  return NextResponse.json(safeBoard, { headers:{"Cache-Control":"private, no-store"} });
}

export async function GET(req, { params }) {
  const { token } = await params;
  const result = await loadBoard(token);
  return boardResponse(req, token, result.rows[0]);
}

export async function POST(req, { params }) {
  const { token } = await params;
  const result = await loadBoard(token);
  const board = result.rows[0];
  if (!board) return NextResponse.json({ error:"Link unavailable" }, { status:404 });
  if (board.public_share_expires_at && new Date(board.public_share_expires_at) <= new Date()) return NextResponse.json({ error:"This shared link has expired" }, { status:410 });
  const body = await req.json().catch(() => ({}));
  if (!board.public_share_password_hash || !await verifyPublicSharePassword(body.password, board.public_share_password_hash)) return NextResponse.json({ error:"Incorrect password" }, { status:401 });
  const response = boardResponse({ cookies:{ get:()=>({ value:publicShareUnlockValue(token) }) } }, token, board);
  response.cookies.set(publicShareCookieName(token), publicShareUnlockValue(token), { httpOnly:true, sameSite:"strict", secure:process.env.NODE_ENV === "production", path:`/api/public/boards/${token}`, maxAge:60 * 60 * 8 });
  return response;
}
