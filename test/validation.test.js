const test = require("node:test");
const assert = require("node:assert/strict");
const { isValidEmail, validatePassword } = require("../server/middleware/validate");

test("email validation accepts normal addresses", () => {
  assert.equal(isValidEmail("user@example.com"), true);
});

test("email validation rejects malformed addresses", () => {
  assert.equal(isValidEmail("not-an-email"), false);
});

test("password policy requires length and mixed character classes", () => {
  assert.equal(validatePassword("short1").includes("at least"), true);
  assert.equal(validatePassword("longpassword").includes("letters and numbers"), true);
  assert.equal(validatePassword("longpassword1"), null);
});
