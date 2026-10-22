const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migration = fs.readFileSync(path.join(__dirname, '..', 'server', 'db', 'migrations', '048_server_only_sensitive_rls.sql'), 'utf8');
const sourceRoot = path.join(__dirname, '..', 'src');

const serverOnly = [
  'password_reset_tokens','email_verification_tokens','authentication_audit_events',
  'professional_invitations','invoices','subscriptions','platform_staff_roles',
  'board_member_access','workspace_modules','workspace_job_roles','calendar_events',
  'demo_requests','demo_request_events','integration_webhooks','portal_comments',
  'marketplace_templates','marketplace_reviews','marketplace_reports','invoice_sequences',
  'file_audit_log','background_job_audit','enterprise_audit_logs','enterprise_inquiries',
  'trip_status_history','nexus_credit_usage','automation_action_usage','scheduler_locks',
  'portal_definitions','workspace_portal_overrides'
];

test('048 names every approved server-only table explicitly', () => {
  for (const table of serverOnly) assert.match(migration, new RegExp(`'${table}'`));
  assert.doesNotMatch(migration, /ALTER TABLE public\.\*|GRANT ALL|GRANT .*anon|GRANT .*authenticated/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE .* FROM PUBLIC/);
  assert.match(migration, /missing_tables/);
  assert.match(migration, /RAISE EXCEPTION '048 prerequisites missing/);
});

test('browser code does not directly query the sensitive tables', () => {
  const source = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) source.push(fs.readFileSync(full, 'utf8'));
    }
  }
  walk(sourceRoot);
  const browserDirect = /supabase\s*\.\s*from\s*\(\s*['"](?:password_reset_tokens|email_verification_tokens|authentication_audit_events|professional_invitations|invoices|subscriptions|platform_staff_roles|board_member_access|workspace_modules|workspace_job_roles|calendar_events|demo_requests|demo_request_events|integration_webhooks|portal_comments|marketplace_templates|marketplace_reviews|marketplace_reports|invoice_sequences|file_audit_log|background_job_audit|enterprise_audit_logs|enterprise_inquiries|trip_status_history|nexus_credit_usage|automation_action_usage|scheduler_locks|portal_definitions|workspace_portal_overrides)['"]/;
  assert.ok(!source.some((text) => browserDirect.test(text)), 'sensitive tables must remain API/server mediated');
});
