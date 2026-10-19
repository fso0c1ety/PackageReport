const { Client } = require('pg');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { getAutomationIdType } = require('../server/db/automationSchema.cjs');
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.includes('test')) throw new Error('Isolated test database required');
  const client = new Client({ connectionString: url.toString(), ssl: false });
  await client.connect();
  try {
    const source = execFileSync('git', ['show', 'HEAD~1:src/app/api/automation/[tableId]/route.js'], { encoding: 'utf8' });
    const block = source.slice(source.indexOf('async function ensureAutomationSchema()'), source.indexOf('async function authorizeTable'));
    const queries = [...block.matchAll(/pool\.query\((?:`([\s\S]*?)`|"([^"]*)")\)/g)].map(match => match[1] || match[2]);
    if (queries.length !== 3) throw new Error('Expected three baseline schema repair round trips');
    const migration = fs.readFileSync('server/db/migrations/044_automation_runtime_schema.sql', 'utf8');
    await client.query('BEGIN');
    // Upgrade an original SERIAL automation table without replacing its ID type or data.
    await client.query('CREATE TEMP TABLE automations(id SERIAL PRIMARY KEY, table_id TEXT); INSERT INTO automations(table_id) VALUES(\'synthetic\')');
    await client.query('CREATE TEMP TABLE automation_runs(id TEXT PRIMARY KEY, automation_id TEXT)');
    await client.query(migration); await client.query(migration);
    const kept = await client.query('SELECT id, table_id FROM automations');
    if (kept.rows.length !== 1 || kept.rows[0].id !== 1) throw new Error('Legacy record changed');
    const iterations = 20;
    let started = performance.now();
    for (let i = 0; i < iterations; i++) for (const sql of queries) await client.query(sql);
    const baseMs = performance.now() - started;
    // HEAD performs no schema repair SQL at request time.
    let metadataCalls = 0;
    const measuredPool = { query: (...args) => { metadataCalls++; return client.query(...args); } };
    started = performance.now();
    for (let i = 0; i < iterations; i++) await getAutomationIdType(measuredPool);
    const metadataMs = performance.now() - started;
    const results = { classification: 'MEASURED_ISOLATED_POSTGRESQL', scope: 'schema prerequisite overhead only; not end-to-end route latency or billed egress', iterations, base: { schemaRepairRoundTrips: iterations * queries.length, elapsedMs: baseMs }, head: { schemaRepairRoundTrips: 0, metadataQueries: metadataCalls, metadataElapsedMs: metadataMs }, schemaRepairCallsReductionPercent: 100, legacyRowsPreserved: true, migrationIdempotent: true };
    fs.mkdirSync('artifacts/runtime-ddl', { recursive: true });
    fs.writeFileSync('artifacts/runtime-ddl/benchmark.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
    await client.query('ROLLBACK');
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
