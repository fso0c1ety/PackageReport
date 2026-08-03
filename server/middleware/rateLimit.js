function createRateLimiter({ windowMs = 60000, max = 120, keyPrefix = "global" } = {}) {
  const buckets = new Map();

  return function rateLimiter(req, res, next) {
    const key = `${keyPrefix}:${req.ip}:${req.user?.id || "anon"}`;
    if (process.env.REDIS_URL) {
      const { getRedisClient } = require("../realtime/redis");
      return getRedisClient().then(async (client) => {
        const redisKey = `rate:${key}`;
        const count = await client.incr(redisKey);
        if (count === 1) await client.pExpire(redisKey, windowMs);
        if (count > max) {
          const ttl = await client.pTTL(redisKey);
          res.setHeader("Retry-After", Math.max(1, Math.ceil(ttl / 1000)));
          return res.status(429).json({ error: "Too many requests" });
        }
        return next();
      }).catch(next);
    }
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: "Too many requests" });
    }

    next();
  };
}

module.exports = { createRateLimiter };
