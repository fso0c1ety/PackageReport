import pg from "pg";

const connectionString = process.env.DATABASE_URL || "";
const parsed = new URL(connectionString);
const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
if (!(parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1") || !/kanban|acceptance|test/i.test(database)) {
  throw new Error("Refusing Kanban bootstrap outside an isolated local test database");
}

const client = new pg.Client({ connectionString, ssl: false });
await client.connect();
try {
  await client.query("BEGIN");
  // Migration 013 alters this legacy table but the repository's historical
  // migration chain never created it. These definitions are only a local
  // bootstrap prerequisite; they are not application migrations.
  await client.query(`
    CREATE TABLE IF NOT EXISTS marketplace_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'other',
      template_key TEXT NOT NULL DEFAULT 'blank',
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      downloads INTEGER NOT NULL DEFAULT 0,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS marketplace_reviews (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      review TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("COMMIT");
  console.log(JSON.stringify({ bootstrap: "kanban", database, prerequisites: ["marketplace_templates", "marketplace_reviews"] }));
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
