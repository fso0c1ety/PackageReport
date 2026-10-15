# Existing-schema repair activation

Prepared from verified catalog differences on 14 October 2026. No Production SQL executed.

## Code and scope

043_existing_schema_compatibility.sql adds missing universal-board objects/columns, automation_runs.scheduled_for and indexes from 011/016/019. It preserves workspace_modules unchanged: existing modules API already detects both JSON and row storage. It does not normalize existing NULL/default differences without data evidence. New server-only tables use RLS and revoke ALL from PUBLIC/anon/authenticated; existing backend direct grants/ownership remain unchanged. Confirm the actual backend role can access newly created tables before rollout; do not assume service_role bypass alone grants table access.

015 alone is insufficient for new portal_approvals: security must be established atomically. 043 covers that repair without rewriting 015. Historical migrations/checksums/ledger stay unchanged. Manual runner currently refuses NULL checksums and requires complete dependency order; do not bypass it or run db:migrate against Production. Ledger reconciliation must first establish historical provenance, not falsely mark missing 010 as applied.

## Tests

Existing schema compatibility workflow uses PostgreSQL 17, a blank local database, synthetic legacy fixture, real roles and hostile default PUBLIC grants. It tests idempotence, legacy module preservation, approval decision constraints, RLS and eight effective privileges. This is NOT a restored Production backup. Full required CI plus Security RLS must pass after publication; path filters include migration changes.

## Backup/restore operator step

Owner must provide an authorized encrypted backup/recovery point and approved offline restore host. Use Supabase managed backup/PITR if available under the actual plan; otherwise an authorized operator uses pg_dump 17 custom format with credentials supplied through a secure password file, never command arguments/logs. Include schema, data, ledger, ACLs, publication/function metadata and object storage recovery reference. Retain backup hashes and UTC recovery time. Do not upload customer archives to GitHub artifacts or publish dumps.

On a network-restricted local PostgreSQL 17, create sanitized equivalent roles and a blank smart_manage_restore_test_* database. Supabase extensions/auth/storage schemas require equivalent local dependencies; failures must be reported, not skipped. Use restore-isolated-backup.ps1 after validating archive integrity. The script does not dump Production, create infrastructure, or perform schema repairs automatically. Verify schema/constraints/ACLs/ledger and hash synthetic or privately computed business invariants; logs contain only counts/pass-fail. A successful pg_restore alone does not prove RLS/API compatibility.

## Dry-run and release order

1. Capture exact pre-change DDL, ACLs including default ACLs/sequence/function permissions, policies, ledger, backend role and memberships. Restore backup and validate counts/invariants offline.
2. In isolated copy evaluate additive repairs before re-running any historical SQL. 010 cannot run unchanged against legacy workspace_modules. Resolve reconciliation separately with reviewed statement/provenance evidence; keep NULL checksums until approved.
3. Apply reviewed repairs atomically with lock_timeout and statement_timeout. Test API modules with the actual equivalent backend role; verify old and candidate application compatibility.
4. Dry-run 041 then 042 with exact pre-existing grants/functions. Validate anon/authenticated/PUBLIC denial and backend/service_role grants, registration trigger, login/reset/verification, billing/invoices, calendar, Nexus/credit accounting, approvals, marketplace, Driver, Kanban and two-workspace authorization. No test Production traffic.
5. Independent reviewer approves immutable SHA, destination identity, recovery point, ledger hash, plan hash and expected ACL deltas. Separate approvals for candidate integration, main merge, database execution and deployment.
6. Production execution remains blocked until the approved manual workflow supports the reconciled ledger/dependency plan. Do not use MIGRATION_TARGET to bypass missing migrations.

## Recovery

Before commit roll back the transaction. After commit stop rollout; preserve added tables/data and choose reviewed corrective SQL or compatible prior application. Do not DROP new tables or blanket restore anonymous grants. ACL rollback uses saved exact ACLs and separate approval because it may reopen known exposure. Full database restore requires owner approval, RPO/RTO assessment and preservation of intervening client writes.

## Governance and environments

Keep PR 124 Draft. Required PR/review, conversation resolution, stale review dismissal, no force-push/deletion, no bypass or auto-merge; require test,portal-acceptance,kanban-postgres-e2e,clean-install,local-safety,benchmark and security-rls-postgres. Independent reviewer is unavailable until owner adds one. No Settings changed.

Ten Vercel variables were reported Production-only; historic Preview retains old credentials until revoked. Before publishing a new branch/PR, verify new Preview builds are blocked and inspect scopes via authorized team access. Rotate legacy keys by creating replacement, validating Production configuration, controlled rollout, then revoking old credentials; preserve running production during transition. DATABASE_URL backend should have least privilege; migration credential separately environment-scoped. Vercel API scope 403 requires owner team authorization; do not switch teams or print token values.
