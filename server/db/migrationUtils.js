const crypto = require("crypto");

const LEGACY_DUPLICATE_PREFIXES = new Set(["004"]);

function checksum(sql) {
  return crypto.createHash("sha256").update(sql).digest("hex");
}

function validateMigrationFiles(files) {
  const duplicatePrefixes = files
    .map((file) => file.split("_")[0])
    .filter((prefix, index, values) => values.indexOf(prefix) !== index)
    .filter((prefix) => !LEGACY_DUPLICATE_PREFIXES.has(prefix));
  if (duplicatePrefixes.length) {
    throw new Error(`Duplicate migration sequence: ${[...new Set(duplicatePrefixes)].join(", ")}`);
  }
  return true;
}

module.exports = { checksum, validateMigrationFiles };
