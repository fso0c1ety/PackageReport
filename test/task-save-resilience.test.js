const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const boardSource = readFileSync(join(__dirname, "..", "src", "app", "TableBoard.tsx"), "utf8");
const createRoute = readFileSync(join(__dirname, "..", "src", "app", "api", "tables", "[tableId]", "tasks", "route.js"), "utf8");
const cellRoute = readFileSync(join(__dirname, "..", "src", "app", "api", "tables", "[tableId]", "tasks", "[taskId]", "cells", "[columnId]", "route.js"), "utf8");

const transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const shouldRetry = (status, attempt) => attempt === 0 && transientStatuses.has(status);

test("task saves retry one transient response and never retry definitive responses", () => {
  for (const status of transientStatuses) {
    assert.equal(shouldRetry(status, 0), true, `expected retry for ${status}`);
    assert.equal(shouldRetry(status, 1), false, `expected one attempt for ${status}`);
  }
  for (const status of [400, 401, 402, 403, 404, 409]) {
    assert.equal(shouldRetry(status, 0), false, `must not retry ${status}`);
  }
});

test("cell and task creation clients preserve one mutation id across retries", () => {
  assert.match(boardSource, /const mutationId = uuidv4\(\);/);
  assert.match(boardSource, /X-SmartManage-Mutation-Id/);
  assert.match(boardSource, /for \(let attempt = 0; attempt < 2; attempt \+= 1\)/);
  assert.match(boardSource, /previousSave\.catch\(\(\) => undefined\)\.then\(persistCell\)/);
});

test("server uses the mutation id as the task id and automation event id", () => {
  assert.match(createRoute, /uuidValidate\(mutationIdHeader \|\| ""\)/);
  assert.match(createRoute, /eventId: newTaskId/);
  assert.match(createRoute, /insertError\?\.code !== "23505"/);
  assert.match(createRoute, /Task creation conflict/);
  assert.match(cellRoute, /const eventId = mutationId/);
});

test("automation failure is isolated after a successful cell update", () => {
  assert.match(cellRoute, /automation failed after save/);
  assert.match(cellRoute, /return NextResponse\.json\(\{ success: true/);
});
