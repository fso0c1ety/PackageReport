import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../../_lib/server";
import { requireBoardPermission } from "../../../_lib/authorization";
import { getTableRealtimeTopic } from "../../../_lib/tableRealtime";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const user = getAuthenticatedUser(request);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tableId } = await params;
  const board = await requireBoardPermission(pool, user.id, tableId, "viewer");
  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

  const topic = getTableRealtimeTopic(tableId);
  if (!topic) return NextResponse.json({ error: "Realtime is unavailable" }, { status: 503 });

  return NextResponse.json({ topic }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
