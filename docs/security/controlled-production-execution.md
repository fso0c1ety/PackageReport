# Controlled existing-project execution package

Target: Supabase `gxzvlsukjodbarlcjyys`; Vercel `package-report`;
live domain `smartmanage.dev`. This document authorizes no execution.

## Evidence and scope

Main baseline: `8a6510c3c9306aeb503f685e729e6b5d07560233`.
CI-only PR 162: `d23e355c8017e86546bce722506d7ba4f4b18867`.
Independent approval: agjendzz-tech, 2026-11-02 16:43:16 UTC.
Integration run 41480476560 and security run 41480483887 passed.
Artifacts are synthetic evidence, not Production recovery proof.

The integration validator applies 044,045,046,047a,048. Its temporary-table
rollback checks PostgreSQL DDL/DML rollback, not migration rollback. Separate
forward-reconciliation evidence tests failure after real 046 SQL, schema and
ledger restoration, preservation of nine NULL checksums, and replay refusal.
Do not generalize these tests to untested Production configurations.

## Gate 1: CI-only merge

Recheck head, independent approval, required checks, and merge state. Authorized
operator command after final approval:

```powershell
gh pr merge 162 --repo fso0c1ety/PackageReport --merge --match-head-commit d23e355c8017e86546bce722506d7ba4f4b18867
```

Main is connected to Vercel Production; treat merging as potentially publishing
live. Either approve this deployment consequence explicitly, or verify a
deployment hold before merging. Do not change project settings without approval.
Record resulting merge SHA, deployment ID, aliases and post-merge checks.

## Gate 2: current recovery and runtime identity

Obtain GET-only backup metadata with an operator credential permitted to read
backups for this project. Record status, ID, timestamps, PITR range and retention.
No credential value belongs in the evidence. If a logical backup is needed,
use a secure operator connection, supported pg_dump, encrypted private storage
and a checksum. Record snapshot time and concurrent-write/data-loss limitations.
Never send customer dumps to Actions artifacts. Restore only in an offline
ephemeral PostgreSQL 17 target with outbound side effects disabled; verify
roles/ACLs, schema, ledger, constraints and aggregate data integrity. A checksum
or pg_restore --list alone does not prove recoverability. Preserve the original
archive and encryption key in separately controlled recovery storage.

Execute through each active application's configured pool, without logging URLs:

```sql
SELECT current_user, rolsuper, rolbypassrls
FROM pg_roles WHERE rolname=current_user;
```

Catalog role attributes and the earlier configured diagnostic are supporting
evidence only. Establish live connection parity and whether legacy is deployed.
Test legitimate operations with equivalent roles before approving SQL.

## Gate 3: urgent 048 containment, separately approved

Use only `048_server_only_sensitive_rls.sql` from the pinned baseline.
SHA256: `FC3DA9F13F6DEA3D7D8D96D231B6AF78BC6DB464666541DF82460E6F0A7C14BA`.
All 29 required tables already exist; inspected 047a definitions match. Do not
replay 047a because its ledger record is absent. Do not replay 041-047 or insert
historical ledger records as part of this containment.

Preflight: verify project/connection, checksum, all target relation kinds and
owners, ACLs including PUBLIC and inherited role grants, policy/trigger/view and
SECURITY DEFINER dependencies, and effective verified-backend CRUD/sequence rights.
Capture a catalog snapshot and exact original ledger. Abort for unexplained drift.

Execution envelope (review together with the unchanged migration):

```sql
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='60s';
-- Execute reviewed catalog preconditions, then exact checksum-pinned 048 SQL.
-- Run postflight assertions below before COMMIT; any failure requires ROLLBACK.
```

Postflight must use the exact 29 names from 048: assert 29 relations, all
relrowsecurity=true; for anon and authenticated assert has_table_privilege=false
for each of SELECT/INSERT/UPDATE/DELETE (232 effective checks). Inspect aclexplode
for PUBLIC grants and role memberships for inherited access. Verify backend
privileges/ownership have not changed. Compare ledger unchanged. Use safe
read-only negative checks in Production; write-denial tests stay isolated.
Only commit after assertions pass. Then inspect Security Advisor and controlled
login/reset, tasks/Kanban, files, invoices, portals, notifications and scheduler.

Abort for lock timeout, statement timeout, any precondition mismatch, effective
restricted privilege, backend permission regression or missing recovery evidence.
After commit, stop further rollout on new permission failures; propose narrowly
scoped reviewed fix-forward. Do not reopen anonymous grants. Production restore
requires separate authorization and an explicit intervening-data-loss decision.

## Gate 4: separate automation 044

SHA256: `20B3BAA91E31565B97D5E9DCA3E267132670261E3323A4208BDB0FF44D0EB1B9`.
Production scheduled_for is missing. Review actual automations/automation_runs
column types, defaults, IDs, FKs, existing indexes and constraints first. Preserve
SERIAL/integer IDs; capture counts and ID/content integrity fingerprints privately.
Use the same transaction budgets and backup gate; execute only 044 after separate
approval. Verify scheduled_for timestamptz, unique partial idempotency index,
unchanged existing records/IDs, repeat application and scheduler DST/retry tests.
Record only a migration actually executed, through a separately reviewed ledger
operation; never replace historical checksums or fill nine NULLs speculatively.
Do not include optional 045/046. Keep PR 159 blocked until schema postflight passes.

## Gate 5: application release

No final candidate SHA is selected. PR 162 changes CI tooling only. Keep optional
160/161 out of the application candidate pending real TableBoard acceptance.
Inventory unique PR159 changes, rebase after the approved baseline, test and
request independent approval. Obtain approval before any main merge that can deploy.

For the accepted merged SHA: stage Production configuration with --skip-domain,
verify protection, cron/worker side effects and unchanged live aliases first.
Run authenticated acceptance across tasks, continuous scroll, global search,
filters/sort, Kanban DnD, calendar/timeline/charts, invoices/export, portals/files,
notifications/automation, Realtime/reconnect and tenant boundaries. Test Windows
installation, prior-version update and rollback; Android install/login/reconnect.
Build success alone does not meet these acceptance gates.

Pin version, source SHA, binary checksums, updater metadata and staged deployment.
Request one explicit release approval naming those artifacts and promotion target.
Web rollback selects the recorded prior deployment; binary rollback uses reviewed
updater/version policy. Code rollback must remain compatible with additive schema.
Never move historical tags. Report HTTP/SQL measurements separately from official
Supabase billing; no measured billed savings are established by this package.
