import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { SECRET_KEY } from "./server";

let realtimeClient;
const realtimeChannels = new Map();

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
  ]);
}

function getSubscribedChannel(topic) {
  const existing = realtimeChannels.get(topic);
  if (existing) return existing;

  const channel = realtimeClient.channel(topic, { config: { broadcast: { ack: true, self: false } } });
  const pending = new Promise((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve(channel);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        realtimeChannels.delete(topic);
        reject(new Error(status));
      }
    });
  });
  realtimeChannels.set(topic, pending);
  return pending;
}

export function getTableRealtimeTopic(tableId) {
  const secret = process.env.REALTIME_TOPIC_SECRET || SECRET_KEY;
  if (!secret) return null;
  const digest = crypto.createHmac("sha256", secret)
    .update(`smart-manage:table:${tableId}`)
    .digest("base64url");
  return `table-${digest}`;
}

export async function broadcastTableInvalidation(tableId, eventType = "UPDATE") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const topic = getTableRealtimeTopic(tableId);
  if (!url || !key || !topic) return false;
  realtimeClient ||= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const channel = await withTimeout(getSubscribedChannel(topic), 5_000, "Realtime subscription timed out");
    const result = await withTimeout(
      channel.send({ type: "broadcast", event: `row-change:${topic}`, payload: { topic, eventType, changedAt: Date.now() } }),
      5_000,
      "Realtime broadcast timed out",
    );
    return result === "ok";
  } catch {
    realtimeChannels.delete(topic);
    return false;
  }
}
