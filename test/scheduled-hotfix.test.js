const test = require("node:test");
const assert = require("node:assert/strict");
const { processScheduledMessages } = require("../server/jobs/scheduledMessages");

function fakeDb() {
  let locked = false;
  const row = {
    id: "row-1",
    table_id: "table-1",
    values: { task: "Task", message: [{ id: "msg-1", scheduledFor: "2020-01-01T00:00:00Z", text: "hello" }] },
  };
  return {
    row,
    async query(sql, params) {
      if (sql.includes("pg_try_advisory_lock")) {
        if (locked) return { rows: [{ acquired: false }] };
        locked = true;
        return { rows: [{ acquired: true }] };
      }
      if (sql.includes("pg_advisory_unlock")) {
        locked = false;
        return { rows: [] };
      }
      if (sql.includes("FROM rows")) return { rows: [row] };
      if (sql.includes("FROM tables")) return { rows: [{ id: "table-1", columns: [{ id: "task" }] }] };
      if (sql.startsWith("UPDATE rows")) return { rows: [] };
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

test("scheduled message processing claims one cross-instance advisory lock", async () => {
  const db = fakeDb();
  let sends = 0;
  const deps = { db, logger: { info() {} }, sendNotification: async () => { sends += 1; } };
  const [first, second] = await Promise.all([
    processScheduledMessages(deps),
    processScheduledMessages(deps),
  ]);
  assert.equal(sends, 1);
  assert.equal(first.processed + second.processed, 1);
});

test("scheduled message failures do not mark notificationSent", async () => {
  const db = fakeDb();
  await assert.rejects(() => processScheduledMessages({
    db,
    logger: { info() {} },
    sendNotification: async () => { throw new Error("delivery failed"); },
  }));
  assert.equal(db.row.values.message[0].notificationSent, undefined);
});
