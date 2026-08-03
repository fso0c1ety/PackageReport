const test = require("node:test");
const assert = require("node:assert/strict");
const { mountCoreRoutes } = require("../server/app");

test("public auth and billing routes mount before the protected API boundary", () => {
  const mounted = [];
  const app = { use(...args) { mounted.push(args); } };
  const authenticateToken = () => {};
  const requireActiveSubscription = () => {};
  const routes = Object.fromEntries(
    ["auth", "billing", "people", "automation", "emailer", "friends", "chats"].map((name) => [name, { name }]),
  );
  mountCoreRoutes(app, { authenticateToken, requireActiveSubscription, routes });
  assert.equal(mounted[0][1], routes.auth);
  assert.equal(mounted[1][1], routes.billing);
  assert.deepEqual(mounted[2], ["/api", authenticateToken, requireActiveSubscription]);
  assert.deepEqual(mounted.slice(3).map((entry) => entry[1].name), ["people", "automation", "emailer", "friends", "chats"]);
});
