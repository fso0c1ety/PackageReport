const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";

const db = require("../server/db");
const mailer = require("../server/mailer");
const firebase = require("../server/firebase");

function definition() {
  return {
    name: "Status delivery",
    trigger: { type: "status_changed", columnId: "status" },
    actions: [{ type: "send_both", config: { recipients: ["recipient@example.com"], columns: ["status"] } }],
  };
}

test("A to B status change runs Send Both exactly once while no-op and disabled flows do not run", async (t) => {
  const originalQuery = db.query;
  const originalSendEmail = mailer.sendEmail;
  const originalPush = firebase.sendPushNotification;
  let runExists = false;
  let enabled = true;
  let runCount = 0;
  let notificationCount = 0;
  let emailCount = 0;
  let activityTimestamp = null;
  const queries = [];

  db.query = async (sql, params = []) => {
    const text = String(sql).replace(/\s+/g, " ").trim();
    queries.push(text);
    if (text.includes("FROM automations")) return { rows: enabled ? [{ id: "automation-1", table_id: "table-1", enabled: true, trigger_col: "status", definition: definition(), recipients: ["recipient@example.com"], cols: ["status"], action_type: "send_both" }] : [] };
    if (text.includes("INSERT INTO automation_runs")) {
      if (runExists) return { rows: [] };
      runExists = true;
      return { rows: [{ id: "run-1", status: "running" }] };
    }
    if (text.includes("information_schema.columns") && text.includes("activity_logs")) return { rows: [{ data_type: "bigint" }] };
    if (text.includes("INSERT INTO activity_logs")) {
      activityTimestamp = params[3];
      if (typeof activityTimestamp !== "number") throw new Error(`invalid input syntax for type bigint: "${activityTimestamp}"`);
      return { rows: [{ id: "log-1" }] };
    }
    if (text.includes("SELECT id, email, fcm_token, fcm_tokens FROM users")) return { rows: [{ id: "user-1", email: "recipient@example.com", fcm_token: null, fcm_tokens: [] }] };
    if (text.includes("INSERT INTO notifications")) { notificationCount += 1; return { rows: [] }; }
    if (text.includes("UPDATE automations SET last_run_at")) { runCount += 1; return { rows: [] }; }
    return { rows: [] };
  };
  mailer.sendEmail = async () => { emailCount += 1; return { messageId: "test" }; };
  firebase.sendPushNotification = async () => undefined;
  delete require.cache[require.resolve("../server/services/automationDelivery")];
  delete require.cache[require.resolve("../server/services/automationEngine")];
  const engine = require("../server/services/automationEngine");
  const table = { id: "table-1", workspace_id: "workspace-1", name: "Orders", columns: [{ id: "status", name: "Status", type: "Status" }] };

  t.after(() => {
    db.query = originalQuery;
    mailer.sendEmail = originalSendEmail;
    firebase.sendPushNotification = originalPush;
    delete require.cache[require.resolve("../server/services/automationDelivery")];
    delete require.cache[require.resolve("../server/services/automationEngine")];
  });

  await engine.runForRowChange({ table, rowId: "row-1", oldValues: { status: "A" }, newValues: { status: "B" }, eventId: "event-1", actorId: "actor-1" });
  assert.equal(runCount, 1);
  assert.equal(notificationCount, 1);
  assert.equal(emailCount, 1);
  assert.equal(typeof activityTimestamp, "number", "legacy BIGINT activity timestamps must receive epoch milliseconds");
  assert.ok(queries.some((sql) => sql.includes("UPDATE automation_runs SET status")));

  await engine.runForRowChange({ table, rowId: "row-1", oldValues: { status: "A" }, newValues: { status: "B" }, eventId: "event-1", actorId: "actor-1" });
  assert.equal(runCount, 1, "same event must be idempotent");
  assert.equal(notificationCount, 1);
  assert.equal(emailCount, 1);

  runExists = false;
  await engine.runForRowChange({ table, rowId: "row-1", oldValues: { status: "B" }, newValues: { status: "B" }, eventId: "event-2", actorId: "actor-1" });
  assert.equal(runCount, 1, "B to B must not trigger");

  enabled = false;
  await engine.runForRowChange({ table, rowId: "row-1", oldValues: { status: "B" }, newValues: { status: "C" }, eventId: "event-3", actorId: "actor-1" });
  assert.equal(runCount, 1, "disabled automation must not trigger");
});
