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

Production ledger is reported at migration 035, while the repository contains prior security migrations 041–043. Migration 048 must not be applied until the ledger, schema fingerprint, backup/recovery point, and dependency sequence are reconciled and independently approved. No Production SQL was executed for this PR.

## Validation and rollback

The isolated PostgreSQL job must verify: anonymous and authenticated CRUD denial; cross-workspace denial; backend-role API functionality; login/reset, billing, invitations, invoices, portals and automations; and Security Advisor results. Rollback is a reviewed forward decision or a restore of the verified recovery point—blindly disabling RLS is not an acceptable rollback.

Residual risk: direct Data API exposure and backend-role identity must be verified against the actual Supabase project before rollout. Billed Egress impact is UNKNOWN.
