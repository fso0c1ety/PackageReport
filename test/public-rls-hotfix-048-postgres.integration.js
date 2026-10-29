const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');

const enabled = process.env.SMART_MANAGE_SECURITY_INTEGRATION === '1';
const url = process.env.DATABASE_URL || '';
const tables = [
  'password_reset_tokens','email_verification_tokens','authentication_audit_events','professional_invitations',
  'invoices','subscriptions','platform_staff_roles','board_member_access','workspace_modules','workspace_job_roles',
  'calendar_events','demo_requests','demo_request_events','integration_webhooks','portal_comments','marketplace_templates',
  'marketplace_reviews','marketplace_reports','invoice_sequences','file_audit_log','background_job_audit',
  'enterprise_audit_logs','enterprise_inquiries','trip_status_history','nexus_credit_usage','automation_action_usage',
  'scheduler_locks','portal_definitions','workspace_portal_overrides'
];

if (!enabled) {
  test('048 PostgreSQL security integration requires explicit opt-in', { skip: 'SMART_MANAGE_SECURITY_INTEGRATION=1 is required' }, () => {});
} else {
  if (!/(localhost|127\.0\.0\.1|::1)/i.test(url) || /supabase\.(co|com)|production/i.test(url)) throw new Error('local PostgreSQL only');
  const client = new Client({ connectionString: url });
  test.before(() => client.connect());
  test.after(() => client.end());

  test('executes all 232 restricted-role CRUD attempts with SQLSTATE evidence', async () => {
    const matrix = [];
    for (const table of tables) {
      // Resolve a real writable column so UPDATE cannot fail at parse time.
      const columns = await client.query(`SELECT attname FROM pg_attribute
        WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped
          AND attgenerated='' ORDER BY attnum LIMIT 1`, [`public.${table}`]);
      assert.equal(columns.rowCount, 1, `fixture column ${table}`);
      const quote = (value) => '"' + value.replaceAll('"', '""') + '"';
      const relation = `public.${quote(table)}`;
      const column = quote(columns.rows[0].attname);
      const statements = {
        SELECT: `SELECT * FROM ${relation} LIMIT 1`,
        INSERT: `INSERT INTO ${relation} DEFAULT VALUES`,
        UPDATE: `UPDATE ${relation} SET ${column}=${column} WHERE FALSE`,
        DELETE: `DELETE FROM ${relation} WHERE FALSE`,
      };
      for (const role of ['anon', 'authenticated']) {
        for (const [operation, sql] of Object.entries(statements)) {
          await client.query('BEGIN');
          let code = null;
          try {
            await client.query(`SET LOCAL ROLE ${quote(role)}`);
            await client.query(sql);
          } catch (error) { code = error.code; }
          finally { await client.query('ROLLBACK'); }
          matrix.push({ table, role, operation, sqlstate: code, pass: code === '42501' });
        }
      }
    }
    console.log(JSON.stringify({ kind: 'restricted-crud-matrix', assertions: matrix.length, matrix }));
    require('node:fs').mkdirSync('security-evidence', { recursive: true });
    require('node:fs').writeFileSync('security-evidence/crud-matrix.json', JSON.stringify({
      sha: process.env.GITHUB_SHA || null, assertions: matrix.length,
      passed: matrix.filter((entry) => entry.pass).length, matrix,
    }, null, 2));
    assert.equal(matrix.length, 232);
    assert.deepEqual(matrix.filter((entry) => !entry.pass), []);
  });

  test('all 29 sensitive tables deny PUBLIC-inherited and effective anon/authenticated CRUD', async () => {
    for (const table of tables) {
      const publicAcl = await client.query(`
        SELECT COALESCE(
          bool_or(a.grantee = 0 AND a.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
          false
        ) AS allowed
        FROM pg_class AS c
        CROSS JOIN LATERAL aclexplode(
          COALESCE(c.relacl, acldefault('r', c.relowner))
        ) AS a
        WHERE c.oid = $1::regclass
      `, [`public.${table}`]);
      assert.equal(publicAcl.rows[0].allowed, false, `PUBLIC SELECT ${table}`);
      for (const role of ['anon', 'authenticated']) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
          const result = await client.query('SELECT has_table_privilege($1,$2,$3) AS allowed', [role, `public.${table}`, privilege]);
          assert.equal(result.rows[0].allowed, false, `${role} ${privilege} ${table}`);
        }
      }
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        const backend = await client.query('SELECT has_table_privilege(current_user,$1,$2) AS allowed', [`public.${table}`, privilege]);
        assert.equal(backend.rows[0].allowed, true, `application role ${privilege} ${table}`);
      }
    }
  });

  test('anonymous direct SELECT is rejected instead of exposing cross-workspace rows', async () => {
    await client.query('SET ROLE anon');
    try {
      await assert.rejects(client.query('SELECT * FROM public.password_reset_tokens LIMIT 1'));
      await assert.rejects(client.query('SELECT * FROM public.invoices LIMIT 1'));
    } finally {
      await client.query('RESET ROLE');
    }
  });
}
