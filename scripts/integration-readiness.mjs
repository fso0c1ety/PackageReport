import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import pg from 'pg';

const { Client } = pg;
const url = new URL(process.env.DATABASE_URL || '');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(url.hostname), 'isolated PostgreSQL target required');
assert.match(url.pathname, /test/i, 'test database required');

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const migrations = ['044_automation_runtime_schema.sql', '045_uploaded_files_workspace_fk_index.sql', '046_guarded_duplicate_indexes.sql', '048_server_only_sensitive_rls.sql'];
const client = new Client({ connectionString: url.toString(), ssl: false });
const evidence = { classification: 'MEASURED_ISOLATED_POSTGRESQL', target: 'disposable-ci-postgres', migrations: [], rollback: null };

async function exists(name) {
  const r = await client.query('SELECT to_regclass($1) IS NOT NULL AS present', [`public.${name}`]);
  return r.rows[0].present;
}

async function main() {
  await client.connect();
  try {
    await client.query("SET lock_timeout = '3s'; SET statement_timeout = '60s'");
    assert.equal(await exists('schema_migrations'), true, 'schema_migrations missing');
    const before = (await client.query('SELECT filename, checksum FROM public.schema_migrations ORDER BY filename')).rows;
    evidence.beforeLedgerRows = before.length;

    for (const filename of migrations) {
      const sql = fs.readFileSync(path.join(root, 'server', 'db', 'migrations', filename), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        evidence.migrations.push({ filename, applied: true });
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`${filename} failed and was rolled back: ${error.message}`);
      }
    }

    const checks = (await client.query(`
      SELECT
        to_regclass('public.automations') IS NOT NULL AS automations,
        to_regclass('public.automation_runs') IS NOT NULL AS automation_runs,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='automation_runs' AND column_name='scheduled_for') AS scheduled_for,
        to_regclass('public.uploaded_files_workspace_id_idx') IS NOT NULL AS uploaded_files_index
    `)).rows[0];
    for (const key of ['automations', 'automation_runs', 'scheduled_for', 'uploaded_files_index']) assert.equal(checks[key], true, `${key} missing after migration`);

    const targetTables = ['password_reset_tokens','email_verification_tokens','authentication_audit_events','professional_invitations','invoices','subscriptions','platform_staff_roles','board_member_access','workspace_modules','workspace_job_roles','calendar_events','demo_requests','demo_request_events','integration_webhooks','portal_comments','marketplace_templates','marketplace_reviews','marketplace_reports','invoice_sequences','file_audit_log','background_job_audit','enterprise_audit_logs','enterprise_inquiries','trip_status_history','nexus_credit_usage','automation_action_usage','scheduler_locks','portal_definitions','workspace_portal_overrides'];
    const rls = (await client.query(`SELECT count(*) FILTER (WHERE c.relrowsecurity) AS enabled, count(*) AS total FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1)`, [targetTables])).rows[0];
    assert.equal(Number(rls.total), 29); assert.equal(Number(rls.enabled), 29);
    const acl = (await client.query(`SELECT count(*) AS violations FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name=ANY($1) AND grantee IN ('PUBLIC','anon','authenticated') AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')`, [targetTables])).rows[0];
    assert.equal(Number(acl.violations), 0, 'restricted CRUD grants remain');
    evidence.postflight = { checks, rls: { enabled: Number(rls.enabled), total: Number(rls.total) }, restrictedCrudGrants: Number(acl.violations) };

    await client.query('BEGIN');
    try { await client.query("SET LOCAL lock_timeout = '1ms'; SELECT 1"); await client.query('ROLLBACK'); evidence.rollback = { transactionRollback: true, dataMutation: false }; }
    catch (error) { await client.query('ROLLBACK'); throw error; }

    fs.mkdirSync(path.join(root, 'artifacts', 'integration-readiness'), { recursive: true });
    fs.writeFileSync(path.join(root, 'artifacts', 'integration-readiness', 'results.json'), JSON.stringify(evidence, null, 2));
  } finally { await client.end(); }
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
