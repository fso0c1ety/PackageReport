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
console.log(JSON.stringify({ files, measurements: rows.length, outputDir, topBytes: top[0]?.responseBytes ?? 0 }, null, 2));
