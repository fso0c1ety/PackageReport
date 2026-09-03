import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "");
  if (!secret) return NextResponse.json({ error: "Diagnostic unavailable" }, { status: 503 });

  const fingerprint = createHash("sha256").update(secret, "utf8").digest("hex").slice(0, 12);
  console.info("[TEMP WEBHOOK SECRET FINGERPRINT]", fingerprint);
  return NextResponse.json({ ok: true });
}