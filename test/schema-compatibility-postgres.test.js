const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('legacy schema repair preserves modules, rows and privileges across two executions', { skip: process.env.SMART_MANAGE_REPAIR_TEST !== '1' }, async () => {
  const target = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1'].includes(target.hostname));
  assert.equal(target.pathname, '/smart_manage_repair_test');
  const { Client } = require('pg');
  const client = new Client({ connectionString: target.toString(), ssl: false });
  await client.connect();
  try {
    assert.equal((await client.query("SELECT to_regclass('public.users') AS existing")).rows[0].existing, null);
    await client.query('BEGIN');
    await client.query(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE TABLE users(id TEXT PRIMARY KEY);
      CREATE TABLE workspaces(id TEXT PRIMARY KEY, owner_id TEXT, created_at TIMESTAMPTZ);
      CREATE TABLE tables(id TEXT PRIMARY KEY,workspace_id TEXT,created_at BIGINT);
      CREATE TABLE rows(id TEXT PRIMARY KEY,table_id TEXT,created_at TIMESTAMP);
      CREATE TABLE notifications(id TEXT PRIMARY KEY,recipient_id TEXT,created_at TIMESTAMPTZ);
      CREATE TABLE automation_runs(id TEXT PRIMARY KEY,automation_id TEXT,created_at TIMESTAMPTZ);
      CREATE TABLE workspace_members(workspace_id TEXT,user_id TEXT,role TEXT);
      CREATE TABLE trip_status_history(workspace_id TEXT,trip_id TEXT,created_at TIMESTAMPTZ);
      CREATE TABLE workspace_modules(workspace_id TEXT PRIMARY KEY,modules JSONB,updated_at TIMESTAMPTZ);
      INSERT INTO users VALUES('owner');
      INSERT INTO workspaces VALUES('w','owner',NOW());
      INSERT INTO tables VALUES('b','w',1);
      INSERT INTO rows VALUES('r','b',NOW());
      INSERT INTO workspace_modules VALUES('w','["ai","calendar"]',NOW());
      GRANT SELECT ON workspace_modules TO service_role;
      ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO anon,authenticated,PUBLIC;
    `);
    const before = (await client.query('SELECT workspace_id,modules,updated_at FROM workspace_modules')).rows;
    const sql = fs.readFileSync('server/db/migrations/043_existing_schema_compatibility.sql', 'utf8');
    await client.query(sql);
    await client.query(sql);
    assert.deepEqual((await client.query('SELECT workspace_id,modules,updated_at FROM workspace_modules')).rows, before);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM rows')).rows[0].n, 1);
    assert.equal((await client.query("SELECT has_table_privilege('service_role','workspace_modules','SELECT') AS allowed")).rows[0].allowed, true);
    for (const name of ['board_views','row_relations','dashboards','dashboard_widgets','saved_filters','user_preferences','portal_approvals']) {
      assert.equal((await client.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',[name])).rows[0].relrowsecurity,true);
      for (const role of ['anon','authenticated']) {
        for (const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) {
          assert.equal((await client.query('SELECT has_table_privilege($1,$2,$3) AS allowed',[role,name,privilege])).rows[0].allowed,false);
        }
        await client.query('SAVEPOINT denied_read');
        await client.query(`SET LOCAL ROLE ${role}`);
        await assert.rejects(client.query(`SELECT 1 FROM ${name}`),{code:'42501'});
        await client.query('ROLLBACK TO SAVEPOINT denied_read');
      }
    }
    await client.query("INSERT INTO portal_approvals VALUES('approval','b','r','test','approved',NULL,NOW())");
    assert.equal((await client.query('SELECT decision FROM portal_approvals')).rows[0].decision,'approved');
    await client.query('SAVEPOINT invalid_decision');
    await assert.rejects(client.query("INSERT INTO portal_approvals VALUES('bad','b','r','test','invalid',NULL,NOW())"),{code:'23514'});
    await client.query('ROLLBACK TO SAVEPOINT invalid_decision');
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
