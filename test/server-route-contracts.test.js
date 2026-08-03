const test = require("node:test");
const assert = require("node:assert/strict");
const { createNexusRouter } = require("../server/routes/nexus");
const { createSystemRouter } = require("../server/routes/system");
const { createUsersRouter } = require("../server/routes/users");
const { createUploadsRouter } = require("../server/routes/uploads");
const { createPushNotificationsRouter } = require("../server/routes/pushNotifications");
const { createNotificationsRouter } = require("../server/routes/notifications");
const { createTableCollaborationRouter } = require("../server/routes/tableCollaboration");
const { createWorkspacesRouter } = require("../server/routes/workspaces");

function routeContracts(router) {
  return router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({ path: layer.route.path, methods: Object.keys(layer.route.methods).sort() }));
}

test("extracted routers preserve their legacy endpoint contracts", () => {
  const logger = { error() {} };
  assert.deepEqual(routeContracts(createSystemRouter({ buildCommit: "test", buildDate: "test" })), [
    { path: "/version", methods: ["get"] },
  ]);
  assert.deepEqual(routeContracts(createNexusRouter({ fetch() {}, logger })), [
    { path: "/nexus/chat", methods: ["post"] },
  ]);
  assert.deepEqual(routeContracts(createUsersRouter({ db: {}, logger })), [
    { path: "/users/profile", methods: ["get"] },
    { path: "/users/profile", methods: ["put"] },
  ]);
  assert.deepEqual(routeContracts(createWorkspacesRouter({ db: {}, logger })), [
    { path: "/workspaces", methods: ["get"] },
    { path: "/workspaces/:workspaceId", methods: ["get"] },
    { path: "/workspaces", methods: ["post"] },
    { path: "/workspaces/:workspaceId", methods: ["put"] },
    { path: "/workspaces/:workspaceId", methods: ["delete"] },
    { path: "/workspaces/:workspaceId/leave", methods: ["delete"] },
    { path: "/workspaces/:workspaceId/tables", methods: ["get"] },
    { path: "/workspaces/:workspaceId/tables", methods: ["post"] },
  ]);
  assert.deepEqual(routeContracts(createUploadsRouter({ db: {}, logger, sharedUploadDir: "a", legacyUploadDir: "b" })), [
    { path: "/upload", methods: ["post"] },
  ]);
  assert.deepEqual(routeContracts(createPushNotificationsRouter({ db: {}, logger, sendPushNotification() {} })), [
    { path: "/users/fcm", methods: ["put"] },
    { path: "/users/fcm", methods: ["delete"] },
    { path: "/test-notification", methods: ["post"] },
  ]);
  assert.deepEqual(routeContracts(createNotificationsRouter({ db: {}, logger })), [
    { path: "/notifications", methods: ["get"] },
    { path: "/notifications/mark-read", methods: ["post"] },
    { path: "/notifications/:id/accept", methods: ["post"] },
    { path: "/notifications/:id/decline", methods: ["post"] },
  ]);
  assert.deepEqual(routeContracts(createTableCollaborationRouter({
    db: {}, io: {}, logger, requireTablePermission: () => (_req, _res, next) => next(),
    sendPushNotification() {}, tableService: {},
  })), [
    { path: "/tables/:tableId/chat", methods: ["get"] },
    { path: "/tables/:tableId/invite", methods: ["post"] },
    { path: "/tables/:tableId/chat", methods: ["post"] },
  ]);
});
