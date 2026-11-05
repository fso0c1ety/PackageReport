# Windows 1.0.32: existing-project remediation proposal

Status: **NOT AUTHORIZED FOR EXECUTION; independent review and recovery evidence pending.**
Target is only Supabase `gxzvlsukjodbarlcjyys`. No new project, web deployment,
domain change, optional 045/046 indexes, or historical migration replay is included.

## Verified read-only findings, 2026-11-05

- `automation_runs.scheduled_for` is absent. The existing scheduler claim SQL
  references it. An isolated legacy-schema probe fails with SQLSTATE 42703.
- The endpoint also used an invalid `pg_input_is_valid(text,regtype)` call.
  The corrected source supplies text type names, matching the live PostgreSQL
  `pg_input_is_valid(text,text)` signature. This backend correction needs a
  separately reviewed and authorized deployment; the column addition alone
  does not fix the endpoint. No such Production deployment has been performed.
- All 29 names in 048 exist, are owned by postgres, have RLS disabled and no
  policies, and give effective SELECT/INSERT/UPDATE/DELETE to anon and
  authenticated. PUBLIC has no explicit ACL entries on these tables; revoking
  PUBLIC alone therefore does not contain the exposure.
- Restricted-role membership query returned no inherited memberships.
- Catalog dependencies on these tables returned no views/functions. This does
  not discover dynamic SQL, application queries, external clients or all trigger
  behavior. The public SECURITY DEFINER function `handle_new_user` is not
  executable by anon/authenticated. No customer rows were fetched for this audit.
- service_role has effective CRUD and BYPASSRLS. This is **not** proof that the
  deployed application pool uses service_role. Its real connection identity and
  tenant checks still require verification through that pool before execution.
- The live ledger has 25 rows, nine NULL checksums and no 044--048 entries.
  Existing schema objects are not evidence that those files ran. In particular,
  do not replay 047a or invent ledger records to explain its existing tables.

## Exact SQL and separate scopes

Review committed LF bytes, not historical CRLF checksum strings:

| Operation | SHA256 |
| --- | --- |
| unchanged 048 server-only containment | `ce15210c3d4165230d1909e73994738ddbbb1fd04fd12e2b23252ff3ca6e24d1` |
| proposed scheduled_for-only addition | `bce7230abe029145961f25377526b46ec24eabc83d4651468f5317e01e190c9a` |
| unchanged full 044, reference only | `c6c6b14ad25235d0c25f15dcb097975548cfdefbe2e1b0ac47592747e9ceda10` |

048 is a server-only deny policy: revoke direct API-role access and enable RLS
on precisely its enumerated tables. Do not invent permissive client policies.
If a legitimate direct-client path is discovered, stop and review that path and
its tenant authorization before applying this proposal.

The minimal scheduler operation is
`server/db/operations/20261105_scheduled_for_only.sql`: add one nullable
TIMESTAMPTZ column. Current inspected columns already cover the other 044
additions. Do not mark full 044 applied after executing this smaller operation.
Record only the real approved operation and checksum in the operator evidence;
leave historical NULL checksums and all unrelated ledger rows untouched.

## Required recovery and preflight

1. Obtain existing-project `backups_read` access (OAuth `database:read`) through
   the supported secure operator connection. Do not put tokens in chat or files.
2. Identify a current usable backup/PITR point. If necessary take an encrypted
   logical backup with approved operator tooling into private recovery storage.
3. Restore to an ephemeral isolated PostgreSQL 17 environment; verify roles,
   grants, schema, constraints, ledger and aggregate data integrity. Synthetic
   restore tests do not establish Production recoverability. Record snapshot,
   checksum, restore duration and measured RPO/RTO; do not invent these values.
4. Verify each deployed backend pool's actual role, CRUD/sequence rights,
   authentication, tenant checks and required routes. Do not assume a role from
   catalog grants or use the connector identity as the application identity.
5. Capture and independently approve the current catalog baseline, ACLs,
   dependencies and ledger. Compare immediately before execution. Refuse drift.
6. Pause scheduler execution and announce a bounded maintenance window through
   approved operational controls. No maintenance switch is activated by this PR.

## Proposed execution order after explicit approval

Execute 048 first as its own transaction. Run verified preconditions, then:

```sql
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
-- Run exact preflight and checksum-pinned 048, not all missing migrations.
-- Assert all 29 RLS flags, 232 effective API-role CRUD denials, no PUBLIC
-- CRUD, unchanged backend rights, and unchanged migration ledger.
-- COMMIT only after every assertion passes; otherwise ROLLBACK.
```

Use `scripts/security-catalog-check.cjs before|after` against a read-only
connection with an explicitly verified EXPECTED_BACKEND_ROLE. It deliberately
uses BEGIN READ ONLY / ROLLBACK; never turn this checker into an executor.

After security postflight and backend health pass, apply the separately approved
one-column scheduler operation in a new transaction with the same lock and
statement limits. Assert absent-column precondition, expected existing types,
nullable TIMESTAMPTZ postcondition, unchanged IDs/sequence/constraints and no
unrelated schema or ledger change. Collect authorized aggregate preservation
evidence without exposing records. Commit only after assertions pass.

After commit, resume the scheduler only after authorized health checks. Verify
due calculation, timezone/DST, successful claim, duplicate prevention, execution
result and controlled notification delivery. SQL claim success alone is not
end-to-end automation acceptance.

## Failure and recovery

Before commit, any error/timeout rolls back the entire operation. The isolated
minimal-repair test verifies rollback removes both the column and inserted claim
while retaining the synthetic legacy row. Isolated 048 evidence includes 232
actual SQLSTATE 42501 denials, backend access and synthetic restore checks.

After commit, stop rollout on a regression. Prefer a reviewed least-privilege
fix-forward; never reopen anonymous grants or disable RLS to silence errors.
Do not drop scheduled_for after new runs have written values. Restoring the
live database is a separate destructive operation requiring specific approval,
a demonstrated recovery point and a reviewed concurrent-write/data-loss plan.

## Evidence and outstanding approvals

- Release binary source: `f7dc9db738cb3c7d69ce4623f31c8bea83648ffb`.
  This includes the supported Kanban mutation endpoint and preservation of a
  newer review-input draft when an older save acknowledgement arrives.
- Isolated 048/security/restore run: 42039612488, PASS.
- Configured Windows artifact: run 42050688838, artifact 13427872163;
  SHA256 `E28D4D3AAAD54B26ECDD139969359003BB358EFB36E77006087B309FD8EDB490`.
  GitHub build settings use the existing project's public publishable key and
  canonical smartmanage.dev URLs. No key was created/rotated and no live Vercel
  setting was changed. Credentials are not included in this proposal.
- Browser Kanban rapid edit/move/reload, notification lifecycle and actual
  scheduled execution/notification/deduplication: run 42045702515, PASS 3/3.
- Minimal scheduler operation and rollback: run 42040061505, PASS.
- Exact configured-EXE upgrade/rollback, custom-directory registry reuse,
  per-user registration, profile/theme recovery and uninstall: 42052486730, PASS.
- Exact configured-EXE full acceptance: 42052480007 found a routing-target
  lifecycle failure; main-renderer routing and redacted process diagnostics are
  prepared. Do not label that run PASS. Follow the corrected exact-binary run.
- Standard-user interactive installer/UAC and encrypted-session recovery are
  not established by elevated silent-install CI. No interactive self-hosted
  Windows runner is configured in the repository.

## Exact-artifact publication control, only after all gates pass

The tag-push `release-windows.yml` workflow rebuilds assets. Before creating the
approved stable tag, hold that specific publisher through the supported GitHub
workflow control and verify its disabled state. Do not cancel unrelated work or
disable required CI. Upload only the already-tested EXE, its matching latest.yml,
blockmap, checksum and stable-name distribution ZIP; then verify stable/Latest
state, tag target, public downloads and updater integrity. Restore the publisher
after verification without dispatching another build. No hold, tag or release
has been executed by this proposal. No main merge is part of publication.

Real owner Auto-Update download/install/restart is explicitly post-publication
verification, and is not by itself a pre-publication blocker.

This proposal is not independently approved and does not claim current Production
backup/recovery, live backend-role parity or post-migration health has passed.
Do not request blanket Production execution approval until those prerequisites
and the exact execution baseline have been verified and independently reviewed.
