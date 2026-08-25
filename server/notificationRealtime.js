const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

let client;
const channels = new Map();

function topicFor(userId) {
  const secret = process.env.REALTIME_TOPIC_SECRET || process.env.JWT_SECRET || process.env.SECRET_KEY;
  if (!secret || !userId) return null;
  const digest = crypto.createHmac("sha256", secret)
    .update(`smart-manage:notifications:${String(userId)}`)
    .digest("base64url");
  return `notifications-${digest}`;
}

function timeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("Realtime operation timed out")), ms))]);
}

async function channelFor(topic) {
  if (channels.has(topic)) return channels.get(topic);
  const channel = client.channel(topic, { config: { broadcast: { ack: true, self: false } } });
  const pending = new Promise((resolve, reject) => channel.subscribe((status) => {
    if (status === "SUBSCRIBED") resolve(channel);
    if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
      channels.delete(topic);
      reject(new Error(status));
    }
  }));
  channels.set(topic, pending);
  return pending;
}

async function broadcastNotificationCreated(userId, notificationId) {
  const topic = topicFor(userId);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!topic || !url || !key || !notificationId) return false;
  client ||= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const channel = await timeout(channelFor(topic), 5000);
    return await timeout(channel.send({
      type: "broadcast",
      event: `notification:${topic}`,
      payload: { topic, notificationId: String(notificationId), createdAt: Date.now() },
    }), 5000) === "ok";
  } catch {
    channels.delete(topic);
    return false;
  }
}

module.exports = { broadcastNotificationCreated };
