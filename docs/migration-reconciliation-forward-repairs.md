# Explicit forward repairs with unknown historical provenance

The default manual runner remains strict: unknown, NULL or mismatched historical checksums are refused. Never fill NULL checksums from today's files or insert historical migrations merely because their objects exist.

An optional, separately reviewed mode supports this one release's already-tested repair sequence: `043_existing_schema_compatibility.sql`, `041_server_only_rls_baseline.sql`, `042_server_only_platform_rls.sql`.

## Mandatory approval and evidence

All existing workflow protections remain: protected main, six required checks, immutable SHA, independently approved production environment, no self-review/admin bypass, fresh run attempt, verified TLS/destination, one advisory lock and explicit migration activation. Supplying a reconciliation document does not enable the workflow or grant Production approval.

The manual dispatch additionally accepts `reconciliation_manifest` and its SHA256 `reconciliation_hash`. The canonical JSON hash is SHA256 of `JSON.stringify(JSON.parse(document))`. Approval must cover the exact document, not only its filename. The document contains metadata only; never include credentials or customer data.

Required version1 document fields:

- `mode: preserve-unknown-history`, exact `releaseSha`, `projectRef: gxzvlsukjodbarlcjyys`.
- `schemaHash` obtained with `schemaEvidenceHash` against the reviewed current destination. It fingerprints columns/defaults, constraints, indexes, public function definitions, function ACLs, triggers, policies, RLS, table grants and relevant role attributes. Do not substitute a local-clone identity for Production identity.
- `originalLedger`: exact filename/checksum pairs, including explicit NULLs; unchanged known checksums must still match the repository.
- `inventory`: complete current migration filename/checksum inventory, with no omissions or additions.
- `preserveNullChecksums`: exact list of NULL-checksum filenames. NULL means unknown historical bytes, not verified application.
- `unverifiedLegacy`: every missing nonrepair filename, each with `execution: unknown`, `action: do-not-replay` and a reviewed evidence explanation. These entries are NOT inserted into `schema_migrations`. The reviewer must validate restored-copy schema compatibility and the evidence for not replaying them.

`ledger_hash` retains the existing runner's SHA256 format; do not substitute the older full-row MD5 diagnostic hash. `plan_hash` binds the exact three ordered filename/checksum pairs. A stale schema, ledger, inventory, commit, hash, omitted history or previously registered repair is refused. No `MIGRATION_TARGET` is allowed.

## Execution and recovery

The three repairs execute in one transaction. Only successful actual repair executions get new ledger rows. Every historical row and NULL is preserved. Any failure rolls back all three, and the advisory lock is released. No privileges are added by this mode.

After success, the old ledger is intentionally not represented as a fully reconstructed history. The ordinary all-migrations runner will still refuse unknown history; future changes require a new reviewed reconciliation/provenance decision. The approved workflow run/document and pre/post hashes form the audit evidence. Do not redispatch the same plan after success.

Production remains disabled until the fresh recovery point, backup/restore readiness, independently reviewed manifest, application compatibility, branch/environment protections and separate owner SQL authorization are confirmed. Local test manifests are explicitly not Production approval documents.

## Validation evidence

On the existing real backup restored locally into Supabase PostgreSQL17.6.1.084, the runner preserved25 historical entries/9 NULLs, added only3 actual repair entries (28 total), preserved legacy workspace_modules, and rejected stale schema/replay. Synthetic unit tests also cover absent approval, changed SHA/schema/inventory, false applied-history claims, omitted NULLs/history, rollback and lock release. No real data or backup is uploaded to CI.

The canonical SQL byte representation matters: Windows automatic CRLF conversion is not accepted as a different historical checksum. Local restored-copy validation used Git's canonical LF archive with `core.autocrlf=false`, matching Linux CI, without changing any SQL file in Git.
