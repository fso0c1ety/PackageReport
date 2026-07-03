const test = require("node:test");
const assert = require("node:assert/strict");
const { userHasTablePermission } = require("../server/services/permissions");

test("workspace owner has table access", () => {
  assert.equal(
    userHasTablePermission({ workspace_owner_id: "u1", shared_users: [] }, "u1", "editor"),
    true
  );
});

test("viewer cannot edit a table", () => {
  assert.equal(
    userHasTablePermission(
      { workspace_owner_id: "owner", shared_users: [{ userId: "u2", permission: "viewer" }] },
      "u2",
      "editor"
    ),
    false
  );
});

test("legacy string shared user is treated as editor for compatibility", () => {
  assert.equal(
    userHasTablePermission({ workspace_owner_id: "owner", shared_users: ["u3"] }, "u3", "editor"),
    true
  );
});
