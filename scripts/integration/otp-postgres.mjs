import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { issueEmailOtp, verifyEmailOtp } from '../../src/app/api/_lib/twoFactor.js';
import { pool } from '../../src/app/api/_lib/server.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for real OTP integration');
process.env.SECRET_KEY ||= 'otp-ci-test-secret';
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const userId = `otp-user-${randomUUID()}`;
const user = { id: userId, name: 'OTP Integration', email: `${userId}@invalid.test`, avatar: null };
const one = async (sql, values = []) => (await db.query(sql, values)).rows[0];
const cleanup = async () => { await db.query('DELETE FROM users WHERE id=$1', [userId]); await db.end(); await pool.end(); };
process.on('SIGINT', cleanup); process.on('SIGTERM', cleanup);

try {
  const table = await one("SELECT c.relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='auth_otp_challenges'");
  assert.equal(table.rls, true);
  await db.query("INSERT INTO users(id,name,email) VALUES($1,$2,$3)", [userId, user.name, user.email]);

  let deliveredCode;
  const delivery = async ({ text }) => { deliveredCode = text.match(/(\d{6})/)?.[1]; };
  const issued = await issueEmailOtp(user, { sendEmailFn: delivery });
  assert.ok(issued.challengeId); assert.match(deliveredCode, /^\d{6}$/);
  assert.equal((await verifyEmailOtp(issued.challengeId, '000000')).ok, false);
  assert.equal((await verifyEmailOtp(issued.challengeId, deliveredCode)).ok, true);
  assert.equal((await verifyEmailOtp(issued.challengeId, deliveredCode)).ok, false);

  const expired = await issueEmailOtp(user, { sendEmailFn: delivery });
  await db.query("UPDATE auth_otp_challenges SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1", [expired.challengeId]);
  assert.equal((await verifyEmailOtp(expired.challengeId, deliveredCode)).ok, false);
  assert.equal((await verifyEmailOtp('missing-otp', deliveredCode)).ok, false);

  const failed = await issueEmailOtp(user, { sendEmailFn: async () => { throw new Error('synthetic delivery failure'); } }).catch(() => null);
  assert.equal(failed, null);
  // Security invariant: issuing a replacement invalidates the prior challenge
  // before delivery. If delivery fails, the replacement is deleted and no
  // challenge remains usable; this prevents reuse of a code that was never
  // delivered and avoids silently reviving the previous challenge.
  assert.equal((await one('SELECT COUNT(*)::int AS count FROM auth_otp_challenges WHERE user_id=$1 AND consumed_at IS NULL', [userId])).count, 0);

  const concurrent = await issueEmailOtp(user, { sendEmailFn: delivery });
  const results = await Promise.all([verifyEmailOtp(concurrent.challengeId, deliveredCode), verifyEmailOtp(concurrent.challengeId, deliveredCode)]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(results.filter(result => !result.ok).length, 1);

  const before = await one("SELECT COALESCE(SUM(calls),0)::bigint AS calls FROM pg_stat_statements WHERE query ~* '(create|alter|drop)\\s+(table|index)' AND query ILIKE '%auth_otp_challenges%'");
  await verifyEmailOtp('missing-otp-2', '000000');
  const after = await one("SELECT COALESCE(SUM(calls),0)::bigint AS calls FROM pg_stat_statements WHERE query ~* '(create|alter|drop)\\s+(table|index)' AND query ILIKE '%auth_otp_challenges%'");
  assert.equal(after.calls, before.calls);
  assert.equal((await one('SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND state=\'idle in transaction\'')).count, 0);
  console.log('OTP PostgreSQL integration PASS: issuance, verification, expiry, replay, delivery cleanup, concurrency, ACL/RLS and no runtime DDL');
} finally { await cleanup(); }
