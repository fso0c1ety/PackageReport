const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../server/services/automationBuilderEngine.cjs");

test("Phase 16 registry exposes every required trigger, condition and action", () => {
  assert.equal(engine.TRIGGERS.length, 10);
  assert.equal(engine.CONDITIONS.length, 7);
  assert.equal(engine.ACTIONS.length, 13);
  assert.ok(engine.ACTIONS.includes("call_webhook"));
  assert.ok(engine.ACTIONS.includes("archive_row"));
  assert.ok(engine.ACTIONS.includes("send_both"));
});

test("notification and email action remains a single dual-delivery flow", () => {
  const definition = engine.normalizeAutomationDefinition({
    triggerType: "column_change",
    triggerCol: "status",
    actionType: "both",
    actionConfig: { recipients: ["ops@example.com"], columns: ["status"] },
  });
  assert.equal(definition.actions[0].type, "send_both");
  assert.deepEqual(definition.actions[0].config.recipients, ["ops@example.com"]);
});

test("legacy automations normalize into WHEN IF THEN definitions", () => {
  const definition = engine.normalizeAutomationDefinition({ triggerType: "column_change", triggerCol: "status", actionType: "create_task", actionConfig: { taskName: "Follow up" } });
  assert.equal(definition.trigger.type, "field_changed");
  assert.equal(definition.trigger.columnId, "status");
  assert.equal(definition.actions[0].type, "create_task");
});

test("status trigger and conditions create a deterministic execution plan", () => {
  const definition = { name: "Delivered invoice", trigger: { type: "status_changed", columnId: "status" }, conditions: [{ type: "status_equals", columnId: "status", value: "Delivered" }, { type: "field_empty", columnId: "invoice" }], actions: [{ type: "send_notification", config: { role: "finance_manager" } }] };
  const plan = engine.buildExecutionPlan(definition, { type: "row_updated", columnType: "Status", oldValues: { status: "In transit", invoice: "" }, newValues: { status: "Delivered", invoice: "" } });
  assert.equal(plan.matched, true);
  assert.equal(plan.actions[0].sequence, 1);
});

test("conditions block actions when IF clauses do not match", () => {
  const plan = engine.buildExecutionPlan({ trigger: { type: "field_changed", columnId: "amount" }, conditions: [{ type: "number_greater_than", columnId: "amount", value: 100 }], actions: [{ type: "send_email" }] }, { type: "row_updated", oldValues: { amount: 1 }, newValues: { amount: 50 } });
  assert.equal(plan.matched, false);
});

test("webhooks require HTTPS", () => {
  const result = engine.validateAutomationDefinition({ trigger: { type: "row_created" }, actions: [{ type: "call_webhook", config: { webhookUrl: "http://localhost/hook" } }] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /HTTPS/);
});

test("loop guard stops recursive automations", () => {
  const guard = engine.createLoopGuard({ maxDepth: 3, maxRunsPerAutomation: 2 });
  assert.equal(guard.canRun({ automationId: "a", depth: 0 }).allowed, true);
  assert.equal(guard.canRun({ automationId: "a", depth: 1 }).allowed, true);
  assert.equal(guard.canRun({ automationId: "a", depth: 1 }).reason, "loop_detected");
  assert.equal(guard.canRun({ automationId: "b", depth: 3 }).reason, "max_depth");
});

test("rate limiter protects automation execution", () => {
  let now = 0;
  const check = engine.createAutomationRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
  assert.equal(check("workspace").allowed, true);
  assert.equal(check("workspace").allowed, true);
  assert.equal(check("workspace").allowed, false);
  now = 1001;
  assert.equal(check("workspace").allowed, true);
});
