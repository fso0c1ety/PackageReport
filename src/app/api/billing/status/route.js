import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_lib/server";
import { getBillingStatus } from "../../_lib/billing";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getBillingStatus(user.id));
  } catch (error) {
    console.error("[BILLING/STATUS]", error);
    return NextResponse.json({ error: "Unable to load billing status" }, { status: 500 });
  }
}
