const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

const CALL_TTL_SECONDS = 90;
const PRESENCE_TTL_SECONDS = 120;
let sharedClientPromise = null;

async function getRedisClient(logger = console) {
  if (!process.env.REDIS_URL) return null;
  if (!sharedClientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (error) => logger.error?.("redis_error", { error: error.message }));
    sharedClientPromise = client.connect().then(() => client).catch((error) => {
      sharedClientPromise = null;
      throw error;
    });
  }
  return sharedClientPromise;
}

async function configureSocketRedisAdapter(io, logger = console) {
  const client = await getRedisClient(logger);
  if (!client) {
    logger.warn?.("socket_redis_adapter_disabled", { reason: "REDIS_URL is not configured" });
    return false;
  }
  const subscriber = client.duplicate();
  await subscriber.connect();
  io.adapter(createAdapter(client, subscriber));
  logger.info?.("socket_redis_adapter_ready");
  return true;
}

async function closeRedis() {
  if (!sharedClientPromise) return;
  const client = await sharedClientPromise.catch(() => null);
  sharedClientPromise = null;
  if (client?.isOpen) await client.quit();
}

function createRealtimeState({ logger = console } = {}) {
  const memorySockets = new Map();
  const memoryCalls = new Map();
  const expires = new Map();
  const cleanupMemory = (key) => {
    if ((expires.get(key) || Infinity) > Date.now()) return;
    memoryCalls.delete(key);
    expires.delete(key);
  };
  return {
    async addSocket(userId, socketId) {
      const client = await getRedisClient(logger);
      const key = `socket:user:${userId}`;
      if (client) {
        const previous = await client.sMembers(key);
        await client.multi().sAdd(key, socketId).expire(key, PRESENCE_TTL_SECONDS).set(`presence:user:${userId}`, "online", { EX: PRESENCE_TTL_SECONDS }).exec();
        return previous;
      }
      const sockets = memorySockets.get(String(userId)) || new Set();
      const previous = [...sockets]; sockets.add(socketId); memorySockets.set(String(userId), sockets); return previous;
    },
    async removeSocket(userId, socketId) {
      const client = await getRedisClient(logger);
      const key = `socket:user:${userId}`;
      if (client) {
        await client.sRem(key, socketId);
        const remaining = await client.sCard(key);
        if (!remaining) await client.del(key, `presence:user:${userId}`);
        return remaining;
      }
      const sockets = memorySockets.get(String(userId));
      sockets?.delete(socketId); if (!sockets?.size) memorySockets.delete(String(userId)); return sockets?.size || 0;
    },
    async touchPresence(userId) {
      const client = await getRedisClient(logger);
      if (client) await client.multi().expire(`socket:user:${userId}`, PRESENCE_TTL_SECONDS).set(`presence:user:${userId}`, "online", { EX: PRESENCE_TTL_SECONDS }).exec();
    },
    async getSockets(userId) {
      const client = await getRedisClient(logger);
      return client ? client.sMembers(`socket:user:${userId}`) : [...(memorySockets.get(String(userId)) || [])];
    },
    async setPendingCall(userId, payload) {
      const client = await getRedisClient(logger);
      const key = `call:pending:${userId}`;
      if (client) return client.set(key, JSON.stringify(payload), { EX: CALL_TTL_SECONDS });
      memoryCalls.set(key, payload); expires.set(key, Date.now() + CALL_TTL_SECONDS * 1000);
    },
    async getPendingCall(userId) {
      const key = `call:pending:${userId}`;
      const client = await getRedisClient(logger);
      if (client) { const value = await client.get(key); return value ? JSON.parse(value) : null; }
      cleanupMemory(key); return memoryCalls.get(key) || null;
    },
    async deletePendingCall(userId) {
      const key = `call:pending:${userId}`;
      const client = await getRedisClient(logger);
      if (client) return client.del(key);
      memoryCalls.delete(key); expires.delete(key);
    },
  };
}

module.exports = { CALL_TTL_SECONDS, PRESENCE_TTL_SECONDS, closeRedis, configureSocketRedisAdapter, createRealtimeState, getRedisClient };
