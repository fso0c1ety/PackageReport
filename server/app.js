const express = require("express");

function configureCoreMiddleware(app, {
  apiRateLimit,
  corsMiddleware,
  logger,
  requestContext,
}) {
  app.use(corsMiddleware);
  app.use(requestContext);
  app.use("/api", apiRateLimit);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use((req, _res, next) => {
    logger.debug("http_request_body", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      body: req.method === "POST" ? logger.redact(req.body || {}) : undefined,
    });
    next();
  });
  return app;
}

function mountCoreRoutes(app, {
  authenticateToken,
  requireActiveSubscription,
  routes,
}) {
  app.use("/api", routes.auth);
  app.use("/api", routes.billing);
  app.use("/api", authenticateToken, requireActiveSubscription);
  for (const route of [routes.users, routes.workspaces, routes.tableMetadata, routes.taskReads, routes.taskMutations, routes.nexus, routes.uploads, routes.pushNotifications, routes.notifications, routes.tableCollaboration, routes.people, routes.automation, routes.emailer, routes.friends, routes.chats]) {
    app.use("/api", route);
  }
  return app;
}

module.exports = { configureCoreMiddleware, mountCoreRoutes };
