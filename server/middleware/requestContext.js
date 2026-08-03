const { randomUUID } = require("crypto");
const logger = require("../utils/logger");
const metrics = require("../observability/metrics");

function requestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    metrics.increment("http_requests_total", { method: req.method, status: String(res.statusCode) });
    metrics.timing("http_request_duration_ms", durationMs, { method: req.method });
    logger.info("http_request", {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.id,
    });
  });

  next();
}

module.exports = requestContext;
