import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_lib/server";

export const runtime = "nodejs";

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stunUrl = process.env.NEXT_PUBLIC_STUN_URL || "stun:stun.l.google.com:19302";
  const iceServers = [{ urls: stunUrl }];

  if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }

  return NextResponse.json({ iceServers });
}
