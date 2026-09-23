import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { createPerfDiagnostic } = createRequire(import.meta.url)("../server/perfDiagnostics.cjs");

test("workspace startup diagnostics emit only sanitized timing fields", () => {
  const messages = [];
  const originalInfo = console.info;
  console.info = (...args) => messages.push(args);
  try {
    const diagnostic = createPerfDiagnostic("workspace_tables", "tables");
    diagnostic.mark("auth_start");
    diagnostic.mark("auth_end");
    diagnostic.mark("query_start");
    diagnostic.mark("query_end");
    diagnostic.finish(200);
  } finally {
    console.info = originalInfo;
  }

  assert.equal(messages.length, 1);
  const record = JSON.parse(messages[0][1]);
  assert.deepEqual(Object.keys(record).sort(), [
    "auth_ms", "authorization_ms", "db_acquire_ms", "phase_ms", "query_ms", "request_kind", "route_label", "serialization_ms", "status", "total_ms",
  ].sort());
  assert.equal(record.route_label, "workspace_tables");
  assert.equal(record.request_kind, "tables");
  assert.equal(record.status, 200);
  assert.equal(typeof record.phase_ms, "object");
});

test("workspace startup diagnostics do not emit identifiers, payloads, or secrets", () => {
  const messages = [];
  const originalInfo = console.info;
  console.info = (...args) => messages.push(args);
  try {
    const diagnostic = createPerfDiagnostic("tasks", "tasks_initial");
    diagnostic.finish(500, Object.assign(new Error("timeout exceeded when trying to connect"), { code: "ETIMEDOUT" }));
  } finally {
    console.info = originalInfo;
  }

  const output = JSON.stringify(messages);
  assert.doesNotMatch(output, /userId|email|tableId|taskId|token|cookie|secret|DATABASE_URL|SELECT|password|header/i);
  const record = JSON.parse(messages[0][1]);
  assert.equal(record.route_label, "tasks");
  assert.equal(record.request_kind, "tasks_initial");
  assert.equal(record.error_category, "db_connection");
  assert.equal(record.error_code, "ETIMEDOUT");
});
