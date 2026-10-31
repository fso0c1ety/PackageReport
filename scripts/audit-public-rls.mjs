import pg from 'pg';

const url = process.env.DATABASE_URL || '';
if (!url) throw new Error('DATABASE_URL is required for read-only local audit');
const parsed = new URL(url);
if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
  throw new Error('Refusing non-local database: this audit never queries Production');
}

const client = new pg.Client({ connectionString: url, ssl: false });
await client.connect();
try {
  const result = await client.query(`
    SELECT n.nspname AS schema_name, c.relname AS table_name,
           c.relrowsecurity AS rls_enabled,
           c.relforcerowsecurity AS rls_forced,
           pg_get_userbyid(c.relowner) AS owner,
           COALESCE(json_agg(json_build_object('grantee', grantee, 'privilege', privilege_type)
             ORDER BY grantee, privilege_type) FILTER (WHERE grantee IS NOT NULL), '[]'::json) AS grants
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN information_schema.role_table_grants g
      ON g.table_schema = n.nspname AND g.table_name = c.relname
      AND g.grantee IN ('PUBLIC', 'anon', 'authenticated')
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    GROUP BY n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity, c.relowner
    ORDER BY c.relname`);
  console.log(JSON.stringify({ source: 'isolated-local-catalog', tables: result.rows }, null, 2));
} finally {
  await client.end();
}
