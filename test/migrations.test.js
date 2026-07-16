const test = require("node:test");
const assert = require("node:assert/strict");
const { checksum, validateMigrationFiles } = require("../server/db/migrationUtils");

test("migration checksums are stable and detect edits", () => {
  assert.equal(checksum("SELECT 1"), checksum("SELECT 1"));
  assert.notEqual(checksum("SELECT 1"), checksum("SELECT 2"));
});

test("migration validation rejects duplicate sequence numbers", () => {
  assert.throws(
    () => validateMigrationFiles(["010_first.sql", "010_second.sql"]),
    /Duplicate migration sequence/,
  );
});

test("migration validation accepts ordered unique files", () => {
  assert.equal(validateMigrationFiles(["001_first.sql", "002_second.sql"]), true);
});
