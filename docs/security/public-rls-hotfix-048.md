# Public RLS security hotfix — migration 048

## Scope

The repository code audit found no direct `supabase.from(...)` browser queries for the 29 tables below. They are accessed through Next.js/Express server routes, where the backend connection remains the intended privileged path. The migration therefore removes `PUBLIC`, `anon`, and `authenticated` table privileges and enables RLS as defense in depth. It does not grant a new backend role or alter existing application authorization.

| Table | Access classification | Representative server/API dependency | Risk |
|---|---|---|---|
| password_reset_tokens | backend-only | forgot-password/reset-password | Critical |
| email_verification_tokens | backend-only | register/auth verify-email | Critical |
| authentication_audit_events | backend-only | login protection/audit | High |
| professional_invitations | API-mediated | board invite/notification accept | High |
| invoices | API-mediated | invoices and billing portal | High |
| subscriptions | backend-only | billing status/webhooks | Critical |
| platform_staff_roles | backend-only | platform access checks | Critical |
| board_member_access | API-mediated | row/table authorization | Critical |
| workspace_modules | API-mediated | workspace modules route | High |
| workspace_job_roles | API-mediated | portal/workspace authorization | High |
| calendar_events | API-mediated | calendar routes | Medium |
| demo_requests | backend-only | internal demo management | High |
| demo_request_events | backend-only | demo audit trail | High |
| integration_webhooks | API-mediated | webhook routes | High |
| portal_comments | API-mediated | public board comments route | High |
| marketplace_templates | API-mediated | marketplace API | Medium |
| marketplace_reviews | API-mediated | marketplace API | Medium |
| marketplace_reports | backend-only | marketplace report API | High |
| invoice_sequences | backend-only | invoice registry | High |
| file_audit_log | backend-only | file audit service | High |
| background_job_audit | backend-only | job audit service | High |
| enterprise_audit_logs | backend-only | enterprise audit paths | High |
| enterprise_inquiries | backend-only | enterprise inquiry API | High |
| trip_status_history | API-mediated | logistics APIs | Medium |
| nexus_credit_usage | backend-only | entitlement/credit service | High |
| automation_action_usage | backend-only | automation usage accounting | High |
| scheduler_locks | backend-only | scheduler coordination | High |
| portal_definitions | API-mediated | portal engine APIs | High |
| workspace_portal_overrides | API-mediated | portal configuration APIs | High |

## Deployment prerequisites

Production read-only reconciliation on 2026-10-22 found all 29 target tables present and the ledger maximum at `035_calendar_events_baseline.sql` (25 rows). No ledger rows for 041–048 were returned. This is evidence of schema/ledger drift, not evidence that any unapplied migration was executed. No Production SQL was changed for this PR.

Migration `047a_usage_webhooks_portal_support.sql` now owns the five tables that were previously created by runtime helpers and runs lexically after 047 and before 048. Migration 048 checks all 29 prerequisites before the first DDL statement and raises an exception listing missing tables; the transaction therefore rolls back atomically. It must not be applied until the 041–047 dependency sequence, schema fingerprint, backup/recovery point and independent approval are reconciled.

### Read-only reconciliation matrix

| Migration range | Production ledger | Repository/schema evidence | Decision |
|---|---|---|---|
| 041 | not present (ledger ends at 035) | repository migration exists; target schema evidence must be reviewed | DO NOT MARK APPLIED |
| 042 | not present | repository migration exists; dependency review required | DO NOT MARK APPLIED |
| 043 | not present | repository migration exists; dependency review required | DO NOT MARK APPLIED |
| 044 | not present | no Production ledger evidence | BLOCKED pending restored-copy review |
| 045 | not present | no Production ledger evidence | BLOCKED pending restored-copy review |
| 046 | not present | no Production ledger evidence | BLOCKED pending restored-copy review |
| 047 | not present | no Production ledger evidence | BLOCKED pending restored-copy review |
| 047a | not present | additive reconciliation migration in this PR; not executed | NOT APPLIED |
| 048 | not present | this PR only; not executed | NOT APPLIED |

The Supabase connector migration listing returned an empty list, so the SQL read-only ledger query is the authoritative evidence above. A restored database copy is still required to prove historical migration compatibility.

### Backend role and workflow coverage

The PostgreSQL integration test checks the effective `current_user` of the application connection for CRUD access and separately checks the CI fixture's `service_role`; it does not claim that either name is the Production backend role. Production backend-role identity must be captured read-only before rollout. The release gate must exercise login/password reset, billing/invoices, invitations, workspace permissions, portals and scheduled-job paths with that role. Missing backend-role identity is a release blocker.

### Pre/post-deployment assertions

Before rollout, record the 29-table inventory, `relrowsecurity`, effective privileges for `anon`, `authenticated`, `PUBLIC` and the verified backend role, plus the ledger maximum and schema fingerprint. After rollout, repeat those assertions and run negative cross-tenant checks and smoke tests for login/reset, billing/invoices, invitations, workspaces, portals and jobs. Any unexpected privilege or workflow change stops rollout.

### Default privileges remediation (separate review required)

Read-only catalog evidence shows broad default ACLs for both `postgres` and `supabase_admin` in `public`, including `anon` and `authenticated` on future tables/functions/sequences. This PR does not change them. A separate reviewed remediation must first inventory object owners and Data API dependencies, then apply owner-specific least-privilege defaults in a maintenance window, validate new-table behavior, and provide an explicit rollback. No blanket REVOKE is authorized by this PR.

## Validation and rollback

The isolated PostgreSQL job must verify: anonymous and authenticated CRUD denial; cross-workspace denial; backend-role API functionality; login/reset, billing, invitations, invoices, portals and automations; and Security Advisor results. Rollback is a reviewed forward decision or a restore of the verified recovery point—blindly disabling RLS is not an acceptable rollback.

Rollback is not “disable RLS”: if 048 has been applied, use the independently approved restore point or a reviewed forward remediation that preserves the deny-by-default posture. Code rollback alone cannot undo database privileges. Residual risk: direct Data API exposure, backend-role identity, restored-copy validation and billed Egress remain UNKNOWN until separately verified.
