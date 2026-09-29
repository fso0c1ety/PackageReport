import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const config = fs.readFileSync(path.join(process.cwd(), "src/portal-engine/configs/professionals.ts"), "utf8");
const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/professional-portal/route.js"), "utf8");

test("doctor portal exposes and scopes documents through the assigned patient relationship", () => {
  assert.match(config, /entityScopes:[^\n]*Documents:\["Documents"\]/);
  assert.match(config, /Documents:\{scope:"assigned_to_me",field:"assignedDoctorUserId"\}/);
  assert.match(config, /Documents:\["Patient","Document Type","Upload Date","Expiry Date","File","Visibility","Status"\]/);
  assert.match(route, /if \(entity === "Documents"\) return context\.patientIds\.has\(ids\(value\(row, table, "Patient"\)\)\[0\]\)/);
});

test("custom parent and patient scopes cannot be widened by a broad board grant", () => {
  assert.match(route, /const customScoped = config\.recordScopes\?\.\[entity\]\?\.scope === "custom"/);
  assert.match(route, /const related = customScoped\s*\n\s*\? relationshipVisible\(entity, row, table\)/);
});
