const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
test("Phase 5 configures Socket.IO Redis adapter and distributed temporary state", () => {
  const redis = readFileSync(join(root, "server", "realtime", "redis.js"), "utf8");
  const server = readFileSync(join(root, "server", "server.js"), "utf8");
  for (const key of ["presence:user:", "call:pending:", "socket:user:"]) assert.match(redis, new RegExp(key));
  assert.match(redis, /createAdapter/);
  assert.match(redis, /EX: CALL_TTL_SECONDS/);
  assert.match(server, /configureSocketRedisAdapter/);
});

test("socket signaling uses shared state and enforces row-scoped task rooms", () => {
  const socket = readFileSync(join(root, "server", "socket", "index.js"), "utf8");
  assert.doesNotMatch(socket, /const pendingOffers = new Map/);
  assert.doesNotMatch(socket, /const userSockets = new Map/);
  assert.match(socket, /realtimeState\.setPendingCall/);
  assert.match(socket, /getRowAccess\(db, taskId/);
  assert.doesNotMatch(socket, /getRowAccess\(db, taskId, userId, "viewer", tableId\)[\s\S]{0,100}typing_board/);
});

test("production topology separates frontend, API, socket and asset origins", () => {
  const env = readFileSync(join(root, ".env.example"), "utf8");
  const render = readFileSync(join(root, "render.yaml"), "utf8");
  for (const name of ["NEXT_PUBLIC_FRONTEND_URL", "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SOCKET_URL", "NEXT_PUBLIC_ASSET_URL"]) assert.match(env, new RegExp(name));
  assert.match(render, /SKIP_NEXT_APP/);
  assert.match(render, /REDIS_URL/);
});
