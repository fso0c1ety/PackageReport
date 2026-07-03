const { randomUUID } = require("crypto");
const logger = require("../utils/logger");

function requestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const startedAt = Date.now();
  res.on("finish", () => {
    logger.info("http_request", {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.id,
    });
  });

  next();
}

module.exports = requestContext;
