const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertSocketIdentity,
  authenticatedCallPayload,
} = require("../server/socket/identity");

test("socket identity always comes from the verified token", () => {
  const socket = { data: { user: { id: "verified-user", email: "verified@example.com" } } };
  assert.equal(assertSocketIdentity(socket), "verified-user");
  assert.equal(assertSocketIdentity(socket, "verified-user"), "verified-user");
  assert.throws(() => assertSocketIdentity(socket, "spoofed-user"), /identity mismatch/i);
});

test("call payload cannot spoof caller identity", () => {
  const socket = { data: { user: { id: "verified-user" } } };
  assert.deepEqual(
    authenticatedCallPayload(socket, { targetId: "recipient", callerId: "verified-user" }),
    { targetId: "recipient", callerId: "verified-user" },
  );
  assert.throws(
    () => authenticatedCallPayload(socket, { targetId: "recipient", callerId: "spoofed-user" }),
    /identity mismatch/i,
  );
});
