const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePermission } = require("../server/routes/tableSharing");

test("legacy table share permissions keep their existing normalization", () => {
  assert.equal(normalizePermission("admin"), "admin");
  assert.equal(normalizePermission("read"), "read");
  assert.equal(normalizePermission("edit"), "edit");
  assert.equal(normalizePermission("unknown"), "edit");
  assert.equal(normalizePermission(undefined), "edit");
});
