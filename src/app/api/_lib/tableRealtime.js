import crypto from "node:crypto";
import { SECRET_KEY } from "./server";

export function getTableRealtimeTopic(tableId) {
  const secret = process.env.REALTIME_TOPIC_SECRET || SECRET_KEY;
  if (!secret) return null;
  const digest = crypto.createHmac("sha256", secret)
    .update(`smart-manage:table:${tableId}`)
    .digest("base64url");
  return `table-${digest}`;
}

export async function broadcastTableInvalidation(tableId, eventType = "UPDATE", change = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const topic = getTableRealtimeTopic(tableId);
  if (!url || !key || !topic) return false;
  try {
    const response = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: [{
        topic,
        event: `row-change:${topic}`,
        payload: { topic, eventType, ...change, changedAt: Date.now() },
      }] }),
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
