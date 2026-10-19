const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('password reset compatibility helper performs no queries or runtime schema repair',async()=>{
  const source=fs.readFileSync('src/app/api/_lib/passwordReset.js','utf8');
  assert(!/\b(?:CREATE\s+TABLE|ALTER\s+TABLE|CREATE\s+(?:UNIQUE\s+)?INDEX)\b/i.test(source));
  assert(!/information_schema|to_regclass|pool\.query/.test(source));
  const body=source.slice(source.indexOf('export async function ensurePasswordResetTable'));
  const fn=vm.runInNewContext('('+body.replace('export ','')+')',Object.freeze({}));await fn();
  const migration=fs.readFileSync('server/db/migrations/004_password_reset_tokens.sql','utf8');
  assert(migration.includes('user_id TEXT NOT NULL REFERENCES users(id)'));
  assert(migration.includes('CREATE TABLE IF NOT EXISTS password_reset_tokens'));
});
