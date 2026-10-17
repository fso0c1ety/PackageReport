import fs from 'node:fs/promises';
import path from 'node:path';

const inputDir = process.env.EGRESS_PHASE2_INPUT_DIR || 'artifacts/egress-phase2/raw';
const outputDir = process.env.EGRESS_PHASE2_OUTPUT_DIR || 'artifacts/egress-phase2';
const files = (await fs.readdir(inputDir)).filter((name) => name.endsWith('.json')).sort();
if (!files.length) throw new Error(`No benchmark JSON files found in ${inputDir}`);

const rows = [];
for (const file of files) {
  const payload = JSON.parse(await fs.readFile(path.join(inputDir, file), 'utf8'));
  for (const result of payload.results || []) {
    rows.push({
      source: file,
      scenario: result.scenario || 'unknown',
      module: 'Kanban/Table tasks API',
      endpoint: '/api/tables/:tableId/tasks',
      tenant: 'synthetic-local',
      rows: result.rows ?? 0,
      requests: result.requests ?? 0,
      dbQueries: 'unmeasured',
      responseBytes: result.responseBytes ?? 0,
      responseMB: ((result.responseBytes ?? 0) / 1024 / 1024).toFixed(6),
      idleMs: result.idleMs ?? 0,
      idleResponseBytes: result.idleResponseBytes ?? 0,
      durationMs: result.durationMs ?? 0,
      classification: 'measured API response bytes; initial request excluded from idle bytes; not Supabase billed egress',
    });
  }
}

await fs.mkdir(outputDir, { recursive: true });
const headers = Object.keys(rows[0]);
const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','))].join('\n') + '\n';
await fs.writeFile(path.join(outputDir, 'EGRESS_BY_MODULE.csv'), csv, 'utf8');
await fs.writeFile(path.join(outputDir, 'egress-phase2-measurements.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  sourceFiles: files,
  measurements: rows,
  limitations: [
    'DB query counts require a local pg_stat_statements snapshot or server instrumentation and are not inferred from HTTP requests.',
    'Supabase billed egress is not inferred from response JSON bytes.',
    'No Production traffic or customer data is used by this artifact.',
  ],
}, null, 2) + '\n', 'utf8');

const top = [...rows].sort((a, b) => Number(b.responseBytes) - Number(a.responseBytes)).slice(0, 20);
await fs.writeFile(path.join(outputDir, 'TOP20_EGRESS_MEASURED.json'), JSON.stringify(top, null, 2) + '\n', 'utf8');
const playwrightPath = path.join(outputDir, 'playwright', 'playwright-egress-measurements.json');
try {
  const playwright = JSON.parse(await fs.readFile(playwrightPath, 'utf8'));
  const networkRows = [];
  const tenantRows = [];
  for (const user of playwright.users || []) {
    let totalRequests = 0; let totalBytes = 0;
    for (const entry of user.routes || []) {
      totalRequests += entry.metrics?.requests || 0; totalBytes += entry.metrics?.responseBytes || 0;
      for (const [endpoint, details] of Object.entries(entry.metrics?.endpoints || {})) networkRows.push({ tenant: user.tenantIndex, route: entry.route, endpoint, requests: details.requests, responseBytes: details.responseBytes, classification: 'MEASURED' });
    }
    tenantRows.push({ tenant: user.tenantIndex, routes: (user.routes || []).length, requests: totalRequests, responseBytes: totalBytes, classification: 'MEASURED' });
  }
  const csvRows = (headers, values) => [headers.join(','), ...values.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')), ''].join('\n');
  await fs.writeFile(path.join(outputDir, 'TOP20_NETWORK_CONSUMERS.csv'), csvRows(['tenant', 'route', 'endpoint', 'requests', 'responseBytes', 'classification'], networkRows.sort((a, b) => b.responseBytes - a.responseBytes).slice(0, 20)));
  await fs.writeFile(path.join(outputDir, 'TENANT_USAGE_MEASUREMENTS.csv'), csvRows(['tenant', 'routes', 'requests', 'responseBytes', 'classification'], tenantRows));
  const before = playwright.database?.before?.rows || []; const after = playwright.database?.after?.rows || []; const byId = new Map(before.map((row) => [String(row.queryid), row]));
  const deltas = after.map((row) => { const prior = byId.get(String(row.queryid)); const currentRows = row.rows ?? row.returnedRows; const priorRows = prior?.rows ?? prior?.returnedRows; const rowsKnown = Number.isFinite(Number(currentRows)) && Number.isFinite(Number(priorRows)); return { queryid: row.queryid, callsDelta: row.calls - (prior?.calls || 0), rowsDelta: rowsKnown ? Number(currentRows) - Number(priorRows) : 'UNKNOWN', executionMsDelta: row.total_exec_time - (prior?.total_exec_time || 0), classification: rowsKnown ? 'MEASURED_GLOBAL_DB_SNAPSHOT' : 'MEASURED_CALLS_ROWS_UNKNOWN' }; });
  await fs.writeFile(path.join(outputDir, 'DB_QUERY_DELTAS.csv'), csvRows(['queryid', 'callsDelta', 'rowsDelta', 'executionMsDelta', 'classification'], deltas));
  await fs.writeFile(path.join(outputDir, 'ROOT_CAUSE_EVIDENCE.md'), `# Phase 2 evidence\n\n- Browser/API measurements: MEASURED from Playwright response bodies.\n- Tenant attribution: MEASURED for synthetic tenant ordinals only.\n- DB query deltas: ${playwright.database?.after?.available ? 'MEASURED_GLOBAL_DB_SNAPSHOT; not request-attributed' : 'UNKNOWN (pg_stat_statements unavailable)'}.\n- Supabase billed egress and Shared Pooler attribution: UNKNOWN; requires official Supabase metrics/support data.\n- Idle samples are independent intervals and exclude navigation bytes.\n`);
} catch { /* Playwright artifact is required by the workflow when that stage runs. */ }
console.log(JSON.stringify({ files, measurements: rows.length, outputDir, topBytes: top[0]?.responseBytes ?? 0 }, null, 2));
