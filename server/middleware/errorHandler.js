function errorHandler(logger) {
  return function handleError(error, req, res, _next) {
    const status = Number(error.status || error.statusCode) || 500;
    logger.error("http_request_failed", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status,
      error: error.message,
    });
    if (res.headersSent) return;
    res.status(status).json({
      error: status >= 500 ? "Internal server error" : error.message,
      requestId: req.requestId,
    });
  };
}

module.exports = errorHandler;
