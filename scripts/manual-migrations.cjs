const fs = require('node:fs');
const path = require('node:path');
const { checksum, validateMigrationFiles } = require('../server/db/migrationUtils');
const { executionSql } = require('../server/db/migrationExecution');

function config(env) {
  if (env.MIGRATION_EXECUTION_APPROVED !== '1' || env.MANUAL_MIGRATIONS_ENABLED !== '1') throw new Error('Migration approval/configuration missing');
  if (!/^[a-f0-9]{40}$/.test(env.APPROVED_SHA || '') || env.APPROVED_SHA !== env.CHECKED_OUT_SHA) throw new Error('Commit verification failed');
  if (!/^[a-f0-9]{64}$/.test(env.EXPECTED_PLAN_HASH || '') || !/^[a-f0-9]{64}$/.test(env.EXPECTED_LEDGER_HASH || '')) throw new Error('Approved plan/ledger hashes required');
  if (env.MIGRATION_TARGET) throw new Error('Manual runner requires complete dependency order');
  let url;
  try { url = new URL(env.DATABASE_URL); } catch { throw new Error('Database configuration invalid'); }
  if (!env.EXPECTED_DB_HOST || !env.EXPECTED_DB_NAME || !env.EXPECTED_DB_USER || !env.EXPECTED_DB_PORT) throw new Error('Destination identity missing');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.search || url.hash) throw new Error('Database URL parameters are not allowed');
  if (url.hostname !== env.EXPECTED_DB_HOST || decodeURIComponent(url.pathname.slice(1)) !== env.EXPECTED_DB_NAME || decodeURIComponent(url.username) !== env.EXPECTED_DB_USER || (url.port || '5432') !== env.EXPECTED_DB_PORT) throw new Error('Destination identity mismatch');
  const local = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  if (env.MIGRATION_LOCAL_TEST === '1') {
    if (!local || env.EXPECTED_DB_NAME !== 'smart_manage_manual_test') throw new Error('Isolated test destination required');
  } else {
    if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REF !== 'refs/heads/main' || local || !env.DATABASE_CA_CERT) throw new Error('Production execution protection missing');
  }
  return { connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: true, ca: env.DATABASE_CA_CERT }, connectionTimeoutMillis: 10000 };
}

function inventory() {
  const dir = path.join(__dirname, '../server/db/migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  validateMigrationFiles(files);
  return files.map(filename => { const sql = fs.readFileSync(path.join(dir, filename), 'utf8'); return { filename, sql, checksum: checksum(sql) }; });
}
function ledgerHash(rows) {
  return checksum(JSON.stringify(rows.map(r => ({ filename: r.filename, checksum: r.checksum })).sort((a,b) => a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0)));
}
async function apply(client, env) {
  const files = inventory();
  // One connection holds the lock for preflight and every transaction.
  const lock = await client.query('SELECT pg_try_advisory_lock(1182026) AS acquired');
  if (!lock.rows[0]?.acquired) throw new Error('Another migration session holds the lock');
  try {
    await client.query("SET search_path TO public");
    const identity = await client.query('SELECT current_database() AS database, current_user AS username');
    if (identity.rows[0]?.database !== env.EXPECTED_DB_NAME || identity.rows[0]?.username !== env.EXPECTED_DB_USER) throw new Error('Connected database identity mismatch');
    const exists = await client.query("SELECT to_regclass('public.schema_migrations') AS ledger");
    if (!exists.rows[0]?.ledger) throw new Error('Existing migration ledger required; fresh production provisioning is a separate approval');
    const before = (await client.query('SELECT filename, checksum FROM public.schema_migrations')).rows;
    for (const row of before) {
      const file = files.find(f => f.filename === row.filename);
      if (!file || !row.checksum || row.checksum !== file.checksum) throw new Error('Historical migration ledger mismatch');
    }
    const pending = files.filter(f => !before.some(r => r.filename === f.filename));
    const planHash = checksum(JSON.stringify(pending.map(f => ({ filename: f.filename, checksum: f.checksum }))));
    if (ledgerHash(before) !== env.EXPECTED_LEDGER_HASH || planHash !== env.EXPECTED_PLAN_HASH) throw new Error('Approved migration plan no longer matches database');
    for (const file of pending) {
      await client.query('BEGIN');
      try {
        await client.query("SET LOCAL lock_timeout='10s'");
        await client.query("SET LOCAL statement_timeout='5min'");
        await client.query(executionSql(file.filename, file.sql));
        await client.query('INSERT INTO public.schema_migrations(filename,checksum,execution_ms) VALUES($1,$2,$3)', [file.filename,file.checksum,0]);
        await client.query('COMMIT');
      } catch { await client.query('ROLLBACK'); throw new Error(`Migration failed: ${file.filename}; review prior committed migrations`); }
    }
    const after = (await client.query('SELECT filename, checksum FROM public.schema_migrations')).rows;
    if (after.length !== files.length || after.some(row => !files.some(f => f.filename === row.filename && f.checksum === row.checksum))) throw new Error('Post-migration verification failed');
    return { applied: pending.map(f => f.filename), verified: after.length };
  } finally { await client.query('SELECT pg_advisory_unlock(1182026)'); }
}
async function main() {
  const options = config(process.env); // Validate before creating any connection.
  const { execFileSync } = require('node:child_process');
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding:'utf8' }).trim();
  if (sha !== process.env.APPROVED_SHA) throw new Error('Checkout SHA mismatch');
  const { Client } = require('pg');
  const c = new Client(options);
  try { await c.connect(); console.log(JSON.stringify(await apply(c, process.env))); }
  finally { await c.end(); }
}
if (require.main === module) main().catch(() => { console.error('Manual migrations refused or failed; inspect approved plan and database state. Credentials and SQL details withheld.'); process.exitCode=1; });
module.exports = { config, inventory, ledgerHash, apply };
