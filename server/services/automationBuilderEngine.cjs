const TRIGGERS = Object.freeze([
  "row_created", "status_changed", "field_changed", "date_arrives", "date_approaching",
  "formula_changed", "reminder", "form_submitted", "relation_added", "row_moved",
]);
const CONDITIONS = Object.freeze([
  "status_equals", "number_greater_than", "field_empty", "date_overdue",
  "person_current_user", "relation_exists", "formula_matches",
]);
const ACTIONS = Object.freeze([
  "send_notification", "send_email", "send_both", "create_row", "create_task", "update_field",
  "assign_user", "move_row", "duplicate_row", "create_relation", "add_comment",
  "call_webhook", "archive_row",
]);
const triggerSet = new Set(TRIGGERS);
const conditionSet = new Set(CONDITIONS);
const actionSet = new Set(ACTIONS);

const legacyTriggers = Object.freeze({
  column_change: "field_changed", formula_change: "formula_changed",
  date_arrives: "date_arrives", reminder: "reminder",
});
const legacyActions = Object.freeze({
  notification: "send_notification", email: "send_email", both: "send_both",
  webhook: "call_webhook", create_task: "create_task", set_status: "update_field",
});

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeClause(clause, allowed, fallback) {
  const source = safeObject(clause);
  const type = allowed.has(String(source.type || "")) ? String(source.type) : fallback;
  return { type, columnId: source.columnId ? String(source.columnId) : null, operator: source.operator ? String(source.operator) : null, value: source.value ?? null, config: safeObject(source.config) };
}

function normalizeAutomationDefinition(input = {}) {
  const source = safeObject(input);
  const rawTrigger = safeObject(source.trigger);
  const triggerType = triggerSet.has(String(rawTrigger.type || ""))
    ? String(rawTrigger.type)
    : legacyTriggers[source.triggerType] || "field_changed";
  const trigger = normalizeClause({ ...rawTrigger, type: triggerType, columnId: rawTrigger.columnId || source.triggerCol, config: { ...safeObject(rawTrigger.config), minutesBefore: source.actionConfig?.minutesBefore ?? rawTrigger.config?.minutesBefore } }, triggerSet, "field_changed");
  const conditions = (Array.isArray(source.conditions) ? source.conditions : []).map((item) => normalizeClause(item, conditionSet, "status_equals"));
  let actions = Array.isArray(source.actions) ? source.actions : [];
  if (!actions.length && source.actionType) actions = [{ type: legacyActions[source.actionType] || source.actionType, config: source.actionConfig || {} }];
  actions = actions.map((item) => normalizeClause(item, actionSet, "send_notification"));
  return {
    version: Math.max(1, Number(source.version) || 1),
    name: String(source.name || "Untitled automation").slice(0, 120),
    enabled: source.enabled !== false,
    trigger,
    conditions,
    actions,
    taskIds: [...new Set((Array.isArray(source.taskIds) ? source.taskIds : []).map(String))],
    metadata: safeObject(source.metadata),
  };
}

function validateAutomationDefinition(input) {
  const definition = normalizeAutomationDefinition(input);
  const errors = [];
  if (!definition.trigger.type) errors.push("A WHEN trigger is required");
  if (["status_changed", "field_changed", "formula_changed", "date_arrives", "date_approaching", "reminder"].includes(definition.trigger.type) && !definition.trigger.columnId) errors.push("The trigger requires a column");
  if (!definition.actions.length) errors.push("At least one THEN action is required");
  definition.actions.forEach((action, index) => {
    if (action.type === "call_webhook" && !/^https:\/\//i.test(String(action.config.webhookUrl || ""))) errors.push(`Action ${index + 1} requires a secure HTTPS webhook URL`);
    if (["update_field", "assign_user", "create_relation"].includes(action.type) && !action.columnId) errors.push(`Action ${index + 1} requires a target column`);
  });
  return { valid: errors.length === 0, errors, definition };
}

function valuesEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function isEmpty(value) { return value == null || value === "" || (Array.isArray(value) && value.length === 0); }

function matchesTrigger(trigger, event) {
  const type = trigger.type;
  if (type === "row_created") return event.type === "row_created";
  if (type === "form_submitted") return event.type === "form_submitted";
  if (type === "relation_added") return event.type === "relation_added";
  if (type === "row_moved") return event.type === "row_moved";
  if (["date_arrives", "date_approaching", "reminder"].includes(type)) return event.type === type && (!trigger.columnId || trigger.columnId === event.columnId);
  if (!trigger.columnId) return false;
  const changed = !valuesEqual(event.oldValues?.[trigger.columnId], event.newValues?.[trigger.columnId]);
  if (!changed) return false;
  if (type === "status_changed") return event.columnType === "Status" || event.columnType === "Dropdown";
  if (type === "formula_changed") return event.columnType === "Formula";
  return type === "field_changed";
}

function matchesCondition(condition, context) {
  const value = context.values?.[condition.columnId];
  switch (condition.type) {
    case "status_equals": return String(value ?? "") === String(condition.value ?? "");
    case "number_greater_than": return Number(value) > Number(condition.value);
    case "field_empty": return isEmpty(value);
    case "date_overdue": { const date = new Date(value); return !Number.isNaN(date.getTime()) && date.getTime() < new Date(context.now || Date.now()).getTime(); }
    case "person_current_user": { const id = typeof value === "object" ? value?.id || value?.userId : value; return String(id || "") === String(context.currentUserId || ""); }
    case "relation_exists": return Array.isArray(value) ? value.length > 0 : Boolean(value?.rowId || value?.id || value);
    case "formula_matches": return String(value ?? "") === String(condition.value ?? "");
    default: return false;
  }
}

function buildExecutionPlan(definitionInput, event, context = {}) {
  const { valid, errors, definition } = validateAutomationDefinition(definitionInput);
  if (!valid) return { matched: false, errors, definition, actions: [] };
  if (!matchesTrigger(definition.trigger, event)) return { matched: false, errors: [], definition, actions: [] };
  if (!definition.conditions.every((condition) => matchesCondition(condition, { ...context, values: event.newValues || context.values || {} }))) return { matched: false, errors: [], definition, actions: [] };
  return { matched: true, errors: [], definition, actions: definition.actions.map((action, index) => ({ ...action, sequence: index + 1 })) };
}

function createLoopGuard({ maxDepth = 5, maxRunsPerAutomation = 3 } = {}) {
  const counts = new Map();
  return {
    canRun({ automationId, depth = 0 }) {
      if (depth >= maxDepth) return { allowed: false, reason: "max_depth" };
      const count = counts.get(String(automationId)) || 0;
      if (count >= maxRunsPerAutomation) return { allowed: false, reason: "loop_detected" };
      counts.set(String(automationId), count + 1);
      return { allowed: true };
    },
  };
}

function createAutomationRateLimiter({ limit = 100, windowMs = 60_000, now = () => Date.now() } = {}) {
  const buckets = new Map();
  return function check(key) {
    const current = now();
    const bucket = buckets.get(key);
    if (!bucket || current - bucket.startedAt >= windowMs) { buckets.set(key, { startedAt: current, count: 1 }); return { allowed: true, remaining: limit - 1 }; }
    if (bucket.count >= limit) return { allowed: false, remaining: 0, retryAfterMs: windowMs - (current - bucket.startedAt) };
    bucket.count += 1;
    return { allowed: true, remaining: limit - bucket.count };
  };
}

module.exports = { TRIGGERS, CONDITIONS, ACTIONS, normalizeAutomationDefinition, validateAutomationDefinition, matchesTrigger, matchesCondition, buildExecutionPlan, createLoopGuard, createAutomationRateLimiter };
