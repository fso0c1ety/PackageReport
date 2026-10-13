const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');

const enabled = process.env.SMART_MANAGE_SECURITY_INTEGRATION === '1';
const connectionString = process.env.DATABASE_URL;

if (!enabled) {
  test('security PostgreSQL integration requires explicit opt-in', { skip: 'SMART_MANAGE_SECURITY_INTEGRATION=1 is required' }, () => {});
} else {
  if (!connectionString) throw new Error('DATABASE_URL is required for security integration');
  const forbidden = /supabase\.(co|com)|smart_manage_prod|production/i;
  if (forbidden.test(connectionString) || !/(localhost|127\.0\.0\.1|::1)/i.test(connectionString)) {
    throw new Error('Security integration accepts only a local PostgreSQL target');
  }

  const client = new Client({ connectionString });
  const serverOnly = [
    'password_reset_tokens', 'email_verification_tokens', 'account_activation_tokens',
    'auth_sessions', 'authentication_audit_events', 'invoices', 'subscriptions',
    'marketplace_templates', 'marketplace_reviews', 'marketplace_reports', 'calendar_events',
  ];

  test.before(async () => {
    await client.connect();
    for (const role of ['anon', 'authenticated', 'service_role']) {
      await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=$1) THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`, [role]);
    }
    await client.query('ALTER ROLE service_role BYPASSRLS');
    for (const table of serverOnly) {
      const exists = await client.query('SELECT to_regclass($1) AS name', [`public.${table}`]);
      if (!exists.rows[0].name) continue;
      await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."${table}" TO service_role`);
    }
  });

  test.after(async () => { await client.end(); });

  test('server-only tables have RLS and no anon/authenticated table privileges', async () => {
    for (const table of serverOnly) {
      const exists = await client.query('SELECT to_regclass($1) AS name', [`public.${table}`]);
      if (!exists.rows[0].name) continue;
      const rls = await client.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass', [`public.${table}`]);
      assert.equal(rls.rows[0].relrowsecurity, true, `${table} must have RLS enabled`);
      for (const role of ['anon', 'authenticated']) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
          const privileges = await client.query('SELECT has_table_privilege($1, $2, $3) AS allowed', [role, `public.${table}`, privilege]);
          assert.equal(privileges.rows[0].allowed, false, `${role} must not ${privilege} ${table}`);
        }
      }
    }
  });

  test('service_role remains able to read protected tables', async () => {
    for (const table of serverOnly) {
      const exists = await client.query('SELECT to_regclass($1) AS name', [`public.${table}`]);
      if (!exists.rows[0].name) continue;
      await client.query('SET ROLE service_role');
      try {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
          const privileges = await client.query('SELECT has_table_privilege(current_user, $1, $2) AS allowed', [`public.${table}`, privilege]);
          assert.equal(privileges.rows[0].allowed, true, `service_role must retain ${privilege} on ${table}`);
        }
        await client.query(`SELECT 1 FROM public."${table}" LIMIT 1`);
      } finally {
        await client.query('RESET ROLE');
      }
    }
  });

  test('public handle_new_user functions are not executable by API roles', async () => {
    const functions = await client.query(`
      SELECT p.oid::regprocedure::text AS signature
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='handle_new_user'
    `);
    for (const { signature } of functions.rows) {
      for (const role of ['anon', 'authenticated']) {
        const result = await client.query('SELECT has_function_privilege($1, $2, $3) AS allowed', [role, signature, 'EXECUTE']);
        assert.equal(result.rows[0].allowed, false, `${role} must not execute ${signature}`);
      }
    }
  });
}
