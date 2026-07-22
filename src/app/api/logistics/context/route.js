import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_lib/server";
import { logisticsAccess } from "../../_lib/logistics";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ logistics: false });
  const access = await logisticsAccess(workspaceId, user.id);
  return NextResponse.json({ logistics: Boolean(access), role: access?.role || null, driver: access?.role === "driver", settings: access?.settings || {} });
}
