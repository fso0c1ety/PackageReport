const fs = require("fs");
const path = require("path");
const db = require("../db");
const logger = require("../utils/logger");
const { checksum, validateMigrationFiles } = require("./migrationUtils");

async function ensureMigrationTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT,
      execution_ms INTEGER,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query("ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT");
  await db.query("ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS execution_ms INTEGER");
}

function migrationFiles() {
  const dir = path.join(__dirname, "migrations");
  return fs.readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
}

async function runMigrations() {
  await ensureMigrationTable();
  const dir = path.join(__dirname, "migrations");
  const files = migrationFiles();
  validateMigrationFiles(files);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const sqlChecksum = checksum(sql);
    const existing = await db.query("SELECT filename, checksum FROM schema_migrations WHERE filename = $1", [file]);
    if (existing.rows.length > 0) {
      const appliedChecksum = existing.rows[0].checksum;
      if (appliedChecksum && appliedChecksum !== sqlChecksum) {
        throw new Error(`Applied migration was modified: ${file}`);
      }
      if (!appliedChecksum) {
        await db.query("UPDATE schema_migrations SET checksum = $1 WHERE filename = $2", [sqlChecksum, file]);
      }
      continue;
    }

    const startedAt = Date.now();
    await db.query("BEGIN");
    try {
      await db.query(sql);
      await db.query(
        "INSERT INTO schema_migrations (filename, checksum, execution_ms) VALUES ($1, $2, $3)",
        [file, sqlChecksum, Date.now() - startedAt],
      );
      await db.query("COMMIT");
      logger.info("migration_applied", { file });
    } catch (err) {
      await db.query("ROLLBACK");
      logger.error("migration_failed", { file, error: err.message });
      throw err;
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrationFiles, runMigrations };
