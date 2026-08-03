const test = require("node:test");
const assert = require("node:assert/strict");
const { bootstrap } = require("../server/bootstrap");

test("bootstrap prepares Next before registering its fallback and listening", async () => {
  const calls = [];
  const app = { all(pattern, handler) { calls.push(["fallback", pattern, handler]); } };
  const nextApp = { async prepare() { calls.push(["prepare"]); } };
  const server = {
    once() {}, removeListener() {},
    listen(port, host, callback) { calls.push(["listen", port, host]); callback(); },
  };
  await bootstrap({ app, handle() {}, nextApp, server, port: 4000, skipNextApp: false, logger: { info() {} } });
  assert.deepEqual(calls.map((entry) => entry[0]), ["prepare", "fallback", "listen"]);
});

test("API-only bootstrap skips Next preparation", async () => {
  const calls = [];
  const server = {
    once() {}, removeListener() {},
    listen(_port, _host, callback) { calls.push("listen"); callback(); },
  };
  await bootstrap({
    app: { all() { calls.push("fallback"); } },
    handle() {},
    nextApp: { async prepare() { calls.push("prepare"); } },
    server,
    port: 4000,
    skipNextApp: true,
    logger: { info() {} },
  });
  assert.deepEqual(calls, ["listen"]);
});

test("bootstrap stops before listening when startup migration fails", async () => {
  let listened = false;
  await assert.rejects(
    bootstrap({
      app: { all() {} }, handle() {}, nextApp: { async prepare() {} },
      server: { once() {}, removeListener() {}, listen() { listened = true; } },
      port: 4000, skipNextApp: true, logger: { info() {} },
      beforeStart: async () => { throw new Error("migration failed"); },
    }),
    /migration failed/,
  );
  assert.equal(listened, false);
});
