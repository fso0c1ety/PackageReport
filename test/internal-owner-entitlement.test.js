const test = require("node:test");
const assert = require("node:assert/strict");
const { INTERNAL_OWNER_EMAILS, isInternalOwnerEmail } = require("../server/services/internalOwnerEntitlement");

test("only approved Smart Manage internal owner accounts receive owner entitlement", () => {
  assert.deepEqual(INTERNAL_OWNER_EMAILS, [
    "a.gjendzz@gmail.com",
    "valitv7@gmail.com",
    "bleonahalili8@gmail.com",
  ]);
  assert.equal(isInternalOwnerEmail("A.GJENDZZ@GMAIL.COM"), true);
  assert.equal(isInternalOwnerEmail("customer@example.com"), false);
  assert.equal(isInternalOwnerEmail("a.gjendzz@gmail.com.evil.example"), false);
});
