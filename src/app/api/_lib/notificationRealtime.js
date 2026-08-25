import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { SECRET_KEY } from "./server";

let realtimeClient;
const channels = new Map();

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Realtime operation timed out")), timeoutMs)),
  ]);
}

export function getNotificationRealtimeTopic(userId) {
  const secret = process.env.REALTIME_TOPIC_SECRET || SECRET_KEY;
  if (!secret || !userId) return null;
  const digest = crypto.createHmac("sha256", secret)
    .update(`smart-manage:notifications:${String(userId)}`)
    .digest("base64url");
  return `notifications-${digest}`;
}

async function getChannel(topic) {
  const existing = channels.get(topic);
  if (existing) return existing;
  const channel = realtimeClient.channel(topic, { config: { broadcast: { ack: true, self: false } } });
  const pending = new Promise((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve(channel);
      if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        channels.delete(topic);
        reject(new Error(status));
      }
    });
  });
  channels.set(topic, pending);
  return pending;
}

export async function broadcastNotificationCreated(userId, notificationId) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const topic = getNotificationRealtimeTopic(userId);
  if (!url || !key || !topic || !notificationId) return false;
  realtimeClient ||= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const channel = await withTimeout(getChannel(topic), 5_000);
    const result = await withTimeout(channel.send({
      type: "broadcast",
      event: `notification:${topic}`,
      payload: { topic, notificationId: String(notificationId), createdAt: Date.now() },
    }), 5_000);
    return result === "ok";
  } catch {
    channels.delete(topic);
    return false;
  }
}
