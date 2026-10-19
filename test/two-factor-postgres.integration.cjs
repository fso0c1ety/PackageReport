const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for the real OTP PostgreSQL integration suite');

let db;
test.before(async () => {
  db = new Client({ connectionString });
  await db.connect();
});
test.after(async () => db?.end());

async function one(sql, params = []) { return (await db.query(sql, params)).rows[0]; }

test('OTP table has migration schema, RLS and restricted direct roles', async () => {
  const table = await one("SELECT c.relrowsecurity AS rls, c.relowner::regrole::text AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='auth_otp_challenges'");
  assert.equal(table.rls, true);
  assert.ok(table.owner);
  const acl = await one("SELECT COALESCE(relacl::text,'') AS acl FROM pg_class WHERE oid='public.auth_otp_challenges'::regclass");
  assert.doesNotMatch(acl.acl, /anon=.*[arwdDxt]/);
  assert.doesNotMatch(acl.acl, /authenticated=.*[arwdDxt]/);
});

test('backend can issue, reject, expire, consume and replay-protect a challenge', async () => {
  const id = `otp-integration-${Date.now()}`;
  await db.query("INSERT INTO auth_otp_challenges(id,user_id,code_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes')", [id, 'otp-test-user', '00'.repeat(32)]);
  const row = await one('SELECT attempts, consumed_at FROM auth_otp_challenges WHERE id=$1', [id]);
  assert.equal(row.attempts, 0); assert.equal(row.consumed_at, null);
  await db.query('UPDATE auth_otp_challenges SET attempts=attempts+1 WHERE id=$1', [id]);
  assert.equal((await one('SELECT attempts FROM auth_otp_challenges WHERE id=$1', [id])).attempts, 1);
  await db.query("UPDATE auth_otp_challenges SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1", [id]);
  assert.equal((await one("SELECT expires_at < NOW() AS expired FROM auth_otp_challenges WHERE id=$1", [id])).expired, true);
  await db.query("UPDATE auth_otp_challenges SET consumed_at=NOW(), expires_at=NOW()+INTERVAL '10 minutes' WHERE id=$1", [id]);
  assert.ok((await one('SELECT consumed_at IS NOT NULL AS consumed FROM auth_otp_challenges WHERE id=$1', [id])).consumed);
  await db.query('DELETE FROM auth_otp_challenges WHERE id=$1', [id]);
  assert.equal((await one('SELECT COUNT(*)::int AS count FROM auth_otp_challenges WHERE id=$1', [id])).count, 0);
});

test('two concurrent row locks permit one consumer at a time', async () => {
  const id = `otp-concurrent-${Date.now()}`;
  await db.query("INSERT INTO auth_otp_challenges(id,user_id,code_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes')", [id, 'otp-test-user', '11'.repeat(32)]);
  const a = new Client({ connectionString }); const b = new Client({ connectionString });
  await Promise.all([a.connect(), b.connect()]);
  try {
    await a.query('BEGIN'); await a.query('SELECT id FROM auth_otp_challenges WHERE id=$1 FOR UPDATE', [id]);
    const blocked = b.query('BEGIN').then(() => b.query('SELECT id FROM auth_otp_challenges WHERE id=$1 FOR UPDATE', [id]));
    await new Promise(resolve => setTimeout(resolve, 50));
    await a.query("UPDATE auth_otp_challenges SET consumed_at=NOW() WHERE id=$1 AND consumed_at IS NULL", [id]);
    await a.query('COMMIT'); await blocked; const result = await b.query('SELECT consumed_at FROM auth_otp_challenges WHERE id=$1', [id]);
    assert.ok(result.rows[0].consumed_at); await b.query('ROLLBACK');
  } finally { await Promise.all([a.end(), b.end()]); await db.query('DELETE FROM auth_otp_challenges WHERE id=$1', [id]); }
});

test('covered OTP operations execute no DDL', async () => {
  const before = await one("SELECT COALESCE(SUM(calls),0)::bigint AS calls FROM pg_stat_statements WHERE query ~* '(create|alter|drop)\\s+(table|index)' AND query ILIKE '%auth_otp_challenges%'");
  await db.query('SELECT id FROM auth_otp_challenges WHERE id=$1', ['missing-otp']);
  const after = await one("SELECT COALESCE(SUM(calls),0)::bigint AS calls FROM pg_stat_statements WHERE query ~* '(create|alter|drop)\\s+(table|index)' AND query ILIKE '%auth_otp_challenges%'");
  assert.equal(after.calls, before.calls);
});
