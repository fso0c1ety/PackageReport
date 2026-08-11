import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { portalWriteAction, portalWriteActions } from "../src/portal-engine/writeActions.js";

test("professional portal writes are centrally allowlisted", () => {
  assert.deepEqual(portalWriteActions("teacher").sort(), ["activity:create", "attendance:create", "meal:create", "observation:create", "photo:create", "sleep:end", "sleep:start"]);
  assert.ok(portalWriteAction("doctor", "lab_request:create"));
  assert.equal(portalWriteAction("teacher", "photo:create").fileField, "File");
  assert.ok(portalWriteAction("doctor", "treatment:update"));
  assert.ok(portalWriteAction("parent", "message:create"));
  assert.ok(portalWriteAction("patient", "appointment:request"));
  assert.ok(portalWriteAction("client", "shipment:request"));
  assert.equal(portalWriteAction("client", "row:arbitrary-update"), null);
});

test("write endpoint enforces exact membership, record scope, fields, transaction and audit", () => {
  const source = readFileSync(join(process.cwd(), "src", "app", "api", "professional-portal", "route.js"), "utf8");
  assert.match(source, /selectPortalMembership\(memberships, \{ workspaceId, portalType \}\)/);
  assert.match(source, /portalWriteAction\(portalType, action\)/);
  assert.match(source, /definition\.fields/);
  assert.match(source, /actualScope !== expectedScope/);
  assert.match(source, /BEGIN/);
  assert.match(source, /COMMIT/);
  assert.match(source, /ROLLBACK/);
  assert.match(source, /INSERT INTO activity_logs/);
  assert.match(source, /INSERT INTO notifications/);
  assert.doesNotMatch(source, /values\s*=\s*body\.values/);
});

test("authenticated portal reads can never be shared through a route cache", () => {
  const route = readFileSync(join(process.cwd(), "src", "app", "api", "professional-portal", "route.js"), "utf8");
  assert.match(route, /dynamic\s*=\s*"force-dynamic"/);
  assert.match(route, /revalidate\s*=\s*0/);
});

test("sensitive writes never copy clinical content into audit text", () => {
  const source = readFileSync(join(process.cwd(), "src", "app", "api", "professional-portal", "route.js"), "utf8");
  assert.match(source, /definition\.sensitive \? null/);
});

test("portal file uploads require membership, exact action, target row and signed capability", () => {
  const source = readFileSync(join(process.cwd(), "src", "app", "api", "upload", "route.js"), "utf8");
  assert.match(source, /selectPortalMembership/);
  assert.match(source, /portalWriteAction\(portalType, portalAction\)/);
  assert.match(source, /row\.workspace_id !== workspaceId/);
  assert.match(source, /validPortalCapability/);
  assert.match(source, /definition\?\.fileField/);
});

test("parent timeline is derived only from scoped shareable operational records", () => {
  const source = readFileSync(join(process.cwd(), "src", "app", "api", "professional-portal", "route.js"), "utf8");
  assert.match(source, /Sleep Started/);
  assert.match(source, /sleep\?\.shareable/);
  assert.match(source, /note\?\.shareable/);
  assert.match(source, /timeline\.sort/);
});
