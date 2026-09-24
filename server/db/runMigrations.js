const fs = require("fs");
const path = require("path");
const db = require("../db");
const logger = require("../utils/logger");
const { checksum, validateMigrationFiles } = require("./migrationUtils");

function migrationFiles() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
  const requestedTargets = String(process.env.MIGRATION_TARGET || "")
    .split(",")
    .map((file) => file.trim())
    .filter(Boolean);
  if (requestedTargets.length === 0) return files;
  const missing = requestedTargets.filter((file) => !files.includes(file));
  if (missing.length > 0) throw new Error(`Unknown migration target: ${missing.join(", ")}`);
  return files.filter((file) => requestedTargets.includes(file));
}

async function runMigrations() {
  const client = await db.pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum TEXT,
        execution_ms INTEGER,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query("ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT");
    await client.query("ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS execution_ms INTEGER");
    const dir = path.join(__dirname, "migrations");
    const files = migrationFiles();
    validateMigrationFiles(files);

    for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const sqlChecksum = checksum(sql);
    const existing = await client.query("SELECT filename, checksum FROM schema_migrations WHERE filename = $1", [file]);
    if (existing.rows.length > 0) {
      const appliedChecksum = existing.rows[0].checksum;
      if (appliedChecksum && appliedChecksum !== sqlChecksum) {
        throw new Error(`Applied migration was modified: ${file}`);
      }
      if (!appliedChecksum) {
        await client.query("UPDATE schema_migrations SET checksum = $1 WHERE filename = $2", [sqlChecksum, file]);
      }
      continue;
    }

    const startedAt = Date.now();
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename, checksum, execution_ms) VALUES ($1, $2, $3)",
        [file, sqlChecksum, Date.now() - startedAt],
      );
      await client.query("COMMIT");
      logger.info("migration_applied", { file });
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error("migration_failed", { file, error: err.message });
      throw err;
    }
    }
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrationFiles, runMigrations };
