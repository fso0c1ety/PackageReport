function createRateLimiter({ windowMs = 60000, max = 120, keyPrefix = "global" } = {}) {
  const buckets = new Map();

  return function rateLimiter(req, res, next) {
    const key = `${keyPrefix}:${req.ip}:${req.user?.id || "anon"}`;
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
