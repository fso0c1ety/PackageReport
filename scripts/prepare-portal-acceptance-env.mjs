import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { assertExpectedDatabaseTarget, normalizedDatabaseIdentity } from "./verify-demo-database-target.mjs";

const sourcePath = path.resolve(process.env.PORTAL_ACCEPTANCE_SOURCE_ENV || ".env.marketing-demo.local");
const targetPath = path.resolve(process.env.PORTAL_ACCEPTANCE_ENV_FILE || ".env.portal-acceptance.local");

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, "")]));
}

function securePassword(length = 32) {
  const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%_-+"];
  const all = groups.join("");
  const chars = groups.map((group) => group[randomBytes(1)[0] % group.length]);
  while (chars.length < length) chars.push(all[randomBytes(1)[0] % all.length]);
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomBytes(1)[0] % (index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join("");
}

function serializeEnv(env) {
  return Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(String(value))}`).join("\n") + "\n";
}

export async function preparePortalAcceptanceEnv() {
  const existing = parseEnv(await readFile(sourcePath, "utf8"));
  const prepared = await readFile(targetPath, "utf8").then(parseEnv).catch(() => ({}));
  const env = { ...existing, ...prepared, ...process.env };
  const identity = normalizedDatabaseIdentity(env.DATABASE_URL);
  assertExpectedDatabaseTarget(identity, env);
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl: env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }, connectionTimeoutMillis: 20_000, max: 1 });
  try {
    const result = await pool.query("SELECT current_database() AS database, current_user AS db_user");
    const row = result.rows[0];
    if (row.database !== identity.database) throw new Error("Connected database identity differs from DATABASE_URL target");
    const fingerprint = createHash("sha256").update(`${identity.host}:${identity.port}/${row.database}:${row.db_user}`).digest("hex").slice(0, 16);
    const output = {
      DATABASE_URL: env.DATABASE_URL,
      SMART_MANAGE_DEMO_DB_HOST: env.SMART_MANAGE_DEMO_DB_HOST,
      SMART_MANAGE_DEMO_DB_NAME: env.SMART_MANAGE_DEMO_DB_NAME,
      DEMO_DATABASE_FINGERPRINT: fingerprint,
      SMART_MANAGE_DEMO_PASSWORD: env.SMART_MANAGE_DEMO_PASSWORD?.length >= 24 ? env.SMART_MANAGE_DEMO_PASSWORD : securePassword(),
      SMART_MANAGE_PORTAL_TEST_PASSWORD: env.SMART_MANAGE_PORTAL_TEST_PASSWORD?.length >= 24 ? env.SMART_MANAGE_PORTAL_TEST_PASSWORD : securePassword(),
      JWT_SECRET: env.JWT_SECRET?.length >= 32 ? env.JWT_SECRET : securePassword(64),
    };
    await writeFile(targetPath, serializeEnv(output), { encoding: "utf8", mode: 0o600, flag: "w" });
    return { configured: true, targetPath: path.basename(targetPath) };
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  preparePortalAcceptanceEnv().then(() => console.log("Portal acceptance environment configured without exposing secret values.")).catch((error) => { console.error(`Portal acceptance environment failed: ${error.message}`); process.exitCode = 1; });
}
