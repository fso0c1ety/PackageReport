const { Client } = require('pg');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const route = 'src/app/api/tables/[tableId]/tasks/route.js';
const baseline = execFileSync('git', ['show', 'f21e6d34c9301397f6930406797d2bca4f5b4719:' + route], { encoding: 'utf8' });
const head = fs.readFileSync(route, 'utf8');
function query(source, restricted, scope) {
  const marker = source.includes('SELECT task.*, page.__visible_total') ? 'SELECT task.*, page.__visible_total' : 'SELECT *, COUNT(*) OVER()';
  const start = source.indexOf('`' + marker) + 1;
  const end = source.indexOf('`,', start);
  assert.ok(start > 0 && end > start);
  const specialized = scope === 'created_by_me' && source.includes('created_by::text=$2::text');
  const visibilityParams = specialized ? Array(2) : restricted ? Array(7) : Array(1);
  const visibleWhere = specialized ? 'table_id=$1 AND created_by::text=$2::text' : restricted ? 'table_id=$1 AND smart_manage_row_visible(values,id::text,created_by::text,$2::jsonb,$3::text,$4::jsonb,$5::text,$6::text,$7::text)' : 'table_id=$1';
  return source.slice(start, end).replace(/\$\{visibleWhere\}/g, visibleWhere).replace(/\$\{visibilityParams.length \+ 1\}/g, String(visibilityParams.length + 1)).replace(/\$\{visibilityParams.length \+ 2\}/g, String(visibilityParams.length + 2));
}
const quantile = (values, p) => [...values].sort((a,b) => a-b)[Math.ceil(values.length*p)-1];
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname) && url.pathname.includes('test'), 'isolated database required');
  const db = new Client({ connectionString: url.toString(), ssl: false }); await db.connect();
  try {
    await db.query('BEGIN');
    await db.query('CREATE TEMP TABLE rows(id TEXT PRIMARY KEY,table_id TEXT,values JSONB,created_by TEXT,created_at TIMESTAMPTZ,updated_at TIMESTAMPTZ); CREATE INDEX ON rows(table_id)');
    const migration = fs.readFileSync('server/db/migrations/022_universal_roles_and_portals.sql','utf8');
    await db.query(migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION smart_manage_json_value_matches')));
    await db.query(`INSERT INTO rows SELECT 'row-'||i, CASE WHEN i%2=0 THEN 'board-a' ELSE 'board-b' END,
      jsonb_build_object('order',i,'assignedUserId',CASE WHEN i%4=0 THEN 'reader' ELSE 'other' END,'teamId',CASE WHEN i%4=0 THEN 'team-a' ELSE 'team-b' END,'departmentId',CASE WHEN i%4=0 THEN 'dept-a' ELSE 'dept-b' END,'companyId',CASE WHEN i%4=0 THEN 'company-a' ELSE 'company-b' END,'payload',repeat(md5(i::text),128)),
      CASE WHEN i%4=0 THEN 'reader' ELSE 'other' END, NOW(),NOW() FROM generate_series(1,20000) i`);
    await db.query('ANALYZE rows');
    const results = [];
    for (const scope of ['all_permitted','created_by_me','assigned_to_me','my_team','my_department','my_company','selected_records','custom']) {
      const restricted = scope !== 'all_permitted';
      const rule = { scope, ids: ['row-4','row-8'], ...(scope === 'custom' ? { rule: { field: 'assignedUserId', value: '$current_user' } } : {}) };
      for (const offset of [0,500]) {
        const params = restricted ? ['board-a','[]','reader',JSON.stringify(rule),'team-a','dept-a','company-a',100,offset] : ['board-a',100,offset];
        const summary = { scope, offset, measurements: {} }; let expected;
        for (const [version, source] of [['BASE',baseline],['HEAD',head]]) {
          const sql = query(source, restricted, scope); const times=[];
          const actualParams = scope === 'created_by_me' && version === 'HEAD' ? ['board-a','reader',100,offset] : params;
          const positive = await db.query(sql, actualParams);
          if (offset === 0) assert.ok(positive.rows.length > 0, `Positive fixture required for ${scope}/${version}`);
          for(let i=0;i<10;i++){const start=performance.now(); const response=await db.query(sql,actualParams);times.push(performance.now()-start); if(version==='BASE') expected=response.rows; else assert.deepEqual(response.rows,expected); assert.ok(response.rows.every(row=>row.table_id==='board-a'));}
          const plan=(await db.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+sql,actualParams)).rows[0]['QUERY PLAN'][0];
          summary.measurements[version]={p50Ms:quantile(times,.5),p95Ms:quantile(times,.95),queryCallsPerPage:1,returnedRows:expected.length,sharedHitBlocks:plan.Plan['Shared Hit Blocks'],localHitBlocks:plan.Plan['Local Hit Blocks'],executionMs:plan['Execution Time'],plan};
        }
        summary.p50ReductionPercent=(summary.measurements.BASE.p50Ms-summary.measurements.HEAD.p50Ms)/summary.measurements.BASE.p50Ms*100;results.push(summary);
      }
    }
    fs.mkdirSync('artifacts/row-visibility',{recursive:true}); fs.writeFileSync('artifacts/row-visibility/results.json',JSON.stringify({classification:'MEASURED_ISOLATED_POSTGRESQL',sameResults:true,limitations:['SQL boundary check only; HTTP membership denial tested separately','No Supabase billed or wire-byte measurement'],results},null,2));
    await db.query('ROLLBACK');
  } finally { await db.end(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
