import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requirePlatformPermission } from "../../../_lib/platformAuthorization";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requirePlatformPermission(req, "demo_requests.read");
  if (access.response) return access.response;

  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "");
  if (!secret) return NextResponse.json({ error: "Diagnostic unavailable" }, { status: 503 });

  return NextResponse.json({
    fingerprint: createHash("sha256").update(secret, "utf8").digest("hex").slice(0, 12),
  });
}