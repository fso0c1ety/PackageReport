const fs = require("fs");
const path = require("path");
const db = require("../db");
const logger = require("../utils/logger");

async function ensureMigrationTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function runMigrations() {
  await ensureMigrationTable();
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    const existing = await db.query("SELECT filename FROM schema_migrations WHERE filename = $1", [file]);
    if (existing.rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await db.query("BEGIN");
    try {
      await db.query(sql);
      await db.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
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

module.exports = { runMigrations };
