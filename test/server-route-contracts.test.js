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
const { createTableMetadataRouter } = require("../server/routes/tableMetadata");
const { createTaskReadsRouter } = require("../server/routes/taskReads");
const { createTaskMutationsRouter } = require("../server/routes/taskMutations");
const { createTaskUpdatesRouter } = require("../server/routes/taskUpdates");
const { createTableSharingRouter } = require("../server/routes/tableSharing");
const { createTeammatesRouter } = require("../server/routes/teammates");
const { createTableCreationRouter } = require("../server/routes/tableCreation");
const { createActivityUpdatesRouter } = require("../server/routes/activityUpdates");
const { createCompatibilityFilesRouter } = require("../server/routes/compatibilityFiles");

function routeContracts(router) {
  return router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({ path: layer.route.path, methods: Object.keys(layer.route.methods).sort() }));
}

test("extracted routers preserve their legacy endpoint contracts", () => {
  const logger = { error() {} };
  const permission = () => (_req, _res, next) => next();
  assert.deepEqual(routeContracts(createSystemRouter({ buildCommit: "test", buildDate: "test" })), [
    { path: "/version", methods: ["get"] },
    { path: "/health", methods: ["get"] },
    { path: "/ready", methods: ["get"] },
    { path: "/metrics", methods: ["get"] },
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
  assert.deepEqual(routeContracts(createTableMetadataRouter({ db: {}, logger, requireTablePermission: permission, requireWorkspacePermission: permission })), [
    { path: "/tables/:tableId", methods: ["patch"] },
    { path: "/tables/:tableId", methods: ["delete"] },
    { path: "/tables/:tableId/columns", methods: ["put"] },
    { path: "/tables", methods: ["get"] },
    { path: "/tables/:tableId", methods: ["get"] },
  ]);
  assert.deepEqual(routeContracts(createTaskReadsRouter({
    logger,
    requireTablePermission: () => (_req, _res, next) => next(),
    tableService: {},
  })), [
    { path: "/tables/:tableId/tasks", methods: ["get"] },
    { path: "/tables/:tableId/tasks/:taskId", methods: ["get"] },
  ]);
  assert.deepEqual(routeContracts(createTaskMutationsRouter({ db: {}, getTableAccess() {}, logger, requireTablePermission: permission, requireRowPermission: permission })), [
    { path: "/tables/:tableId/tasks", methods: ["post"] },
    { path: "/tables/:tableId/doc", methods: ["put"] },
    { path: "/tables/:tableId/tasks/:taskId", methods: ["delete"] },
    { path: "/tables/:tableId/tasks/order", methods: ["put"] },
  ]);
  assert.deepEqual(routeContracts(createTaskUpdatesRouter({ appQueue: {}, db: {}, logger, requireRowPermission: permission, sendNotification() {} })), [
    { path: "/tables/:tableId/tasks", methods: ["put"] },
  ]);
  assert.deepEqual(routeContracts(createTableSharingRouter({ billingService: {}, db: {}, logger, sendPushNotification() {} })), [
    { path: "/tables/:tableId/share", methods: ["post"] },
    { path: "/tables/:tableId/members", methods: ["get"] },
    { path: "/tables/:tableId/shared-users", methods: ["get"] },
    { path: "/tables/:tableId/share/:userId", methods: ["delete"] },
    { path: "/tables/:tableId/invite-code", methods: ["post"] },
    { path: "/tables/:tableId/invite-code", methods: ["delete"] },
    { path: "/tables/join", methods: ["post"] },
  ]);
  assert.deepEqual(routeContracts(createTeammatesRouter({ db: {}, logger })), [
    { path: "/teammates", methods: ["get"] },
    { path: "/teammates/:teammateId", methods: ["delete"] },
    { path: "/teammates/:teammateId/permission", methods: ["put"] },
    { path: "/tables/:tableId/teammates/:teammateId/permission", methods: ["put"] },
  ]);
  assert.deepEqual(routeContracts(createTableCreationRouter({ db: {}, logger })), [
    { path: "/tables", methods: ["post"] },
    { path: "/tables/import-excel", methods: ["post"] },
  ]);
  assert.deepEqual(routeContracts(createActivityUpdatesRouter({ db: {}, logger, normalizeActivityHtml() {} })), [
    { path: "/email-updates", methods: ["get"] },
  ]);
  assert.deepEqual(routeContracts(createCompatibilityFilesRouter({
    authenticateToken: permission, db: {}, legacyUploadDir: "legacy", logger, requireFilePermission: permission, sharedUploadDir: "shared",
  })), [
    { path: "/uploads/:filename", methods: ["get"] },
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
