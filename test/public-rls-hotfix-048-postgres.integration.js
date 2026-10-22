const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');

const enabled = process.env.SMART_MANAGE_SECURITY_INTEGRATION === '1';
const url = process.env.DATABASE_URL || '';
const tables = ['password_reset_tokens','email_verification_tokens','authentication_audit_events','professional_invitations','invoices','subscriptions','platform_staff_roles','board_member_access'];

if (!enabled) {
  test('048 PostgreSQL security integration requires explicit opt-in', { skip: 'SMART_MANAGE_SECURITY_INTEGRATION=1 is required' }, () => {});
} else {
  if (!/(localhost|127\.0\.0\.1|::1)/i.test(url) || /supabase\.(co|com)|production/i.test(url)) throw new Error('local PostgreSQL only');
  const client = new Client({ connectionString: url });
  test.before(() => client.connect());
  test.after(() => client.end());

  test('sensitive tables deny effective anon/authenticated CRUD and retain backend access', async () => {
    for (const table of tables) {
      for (const role of ['anon', 'authenticated']) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
          const result = await client.query('SELECT has_table_privilege($1,$2,$3) AS allowed', [role, `public.${table}`, privilege]);
          assert.equal(result.rows[0].allowed, false, `${role} ${privilege} ${table}`);
        }
      }
      const backend = await client.query('SELECT has_table_privilege($1,$2,$3) AS allowed', ['service_role', `public.${table}`, 'SELECT']);
      assert.equal(backend.rows[0].allowed, true, `service_role SELECT ${table}`);
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
