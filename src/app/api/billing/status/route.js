import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_lib/server";
import { getScopedBillingStatus } from "../../_lib/billing";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    return NextResponse.json(await getScopedBillingStatus(user.id, {
      workspaceId: url.searchParams.get("workspaceId") || undefined,
      tableId: url.searchParams.get("tableId") || undefined,
    }));
  } catch (error) {
    console.error("[BILLING/STATUS]", error);
    return NextResponse.json({ error: "Unable to load billing status" }, { status: 500 });
  }
}
