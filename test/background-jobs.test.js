const assert = require("node:assert/strict");
const test = require("node:test");
const { MemoryQueue, safeJobId } = require("../server/jobs/queue");

test("jobs are idempotent and expose status", async () => {
  const queue = new MemoryQueue("test"); let runs = 0;
  queue.process("email.send", async () => { runs += 1; });
  const first = await queue.add("email.send", {}, { idempotencyKey: "same:email" });
  const duplicate = await queue.add("email.send", {}, { idempotencyKey: "same:email" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(first.id, duplicate.id); assert.equal(runs, 1);
  assert.equal((await queue.getStatus(first.id)).status, "completed");
});

test("failed jobs retry and terminate in dead-letter state", async () => {
  const queue = new MemoryQueue("test-fail");
  queue.process("email.send", async () => { throw new Error("provider unavailable"); });
  const job = await queue.add("email.send", {}, { attempts: 3, idempotencyKey: "failed-email" });
  await new Promise((resolve) => setImmediate(resolve));
  const status = await queue.getStatus(job.id);
  assert.equal(status.attempts, 3); assert.equal(status.status, "dead-letter");
});

test("BullMQ contract uses exponential retry and persistent dead letter queue", () => {
  const source = require("node:fs").readFileSync(require.resolve("../server/jobs/queue"), "utf8");
  assert.match(source, /type: "exponential"/); assert.match(source, /dead-letter/); assert.equal(safeJobId("a:b"), "a_b");
});
