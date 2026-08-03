const test = require("node:test");
const assert = require("node:assert/strict");
const { activityChanges, notifyDiscussion, notifyFileComments } = require("../server/routes/taskUpdates");

const logger = { error() {}, info() {} };

test("task updates preserve legacy activity text and ignore discussion metadata", () => {
  const table = { columns: [{ id: "status", name: "Status" }] };
  assert.deepEqual(activityChanges(table, { status: "Open" }, { status: "Done", message: [] }, "now"), [
    { text: 'Updated Status to "Done"', time: "now", user: "User" },
  ]);
});

test("new discussions retain notification marker and legacy notification payload", async () => {
  const calls = [];
  const newValues = { task: "Demo", message: [{ sender: "Ana", text: "Ready" }] };
  await notifyDiscussion({
    newValues,
    oldValues: { message: [] },
    req: { user: { id: "u1", name: "Ana" } },
    rowId: "r1",
    sendNotification: async (...args) => calls.push(args),
    table: { columns: [{ id: "task", name: "Task" }] },
    logger,
  });
  assert.equal(newValues.message[0].notificationSent, true);
  assert.deepEqual(calls[0].slice(0, 4), ["New Discussion", "Ana commented on the Demo: Ready", "task_chat", { taskId: "r1" }]);
});

test("only newly added file comments send a notification", async () => {
  const calls = [];
  await notifyFileComments({
    newValues: { files: [{ url: "x", name: "CMR", comments: [{ text: "old" }, { text: "new", user: "Driver" }] }] },
    oldValues: { files: [{ url: "x", name: "CMR", comments: [{ text: "old" }] }] },
    req: { user: { id: "u1" } },
    rowId: "r1",
    sendNotification: async (...args) => calls.push(args),
    table: { columns: [{ id: "files", type: "Files" }] },
    logger,
  });
  assert.deepEqual(calls[0].slice(0, 4), ["New File Comment", "Driver commented on the CMR: new", "file_comment", { taskId: "r1" }]);
});
