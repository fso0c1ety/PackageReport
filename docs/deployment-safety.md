# Deployment activation: blocked until configuration is confirmed

This branch separates application builds from manual database migrations. No production action is authorized by merging this document. Merge, database migration, and application deployment require separate approval.

## Required settings (not changed by this PR)

1. Protect main: required pull request review, required Quality, Portal Acceptance, Kanban, clean PostgreSQL and safety checks, restrict direct pushes, deny force-push/deletion, restrict administrative bypass. Keep auto-merge disabled.
2. Configure the GitHub production environment with independent required reviewers, prevent self-review, disable admin bypass, and deployment branch restricted to main. The manual workflow checks reviewer rules and recorded approval and fails if inaccessible or absent.
3. Keep repository variable MANUAL_MIGRATIONS_ENABLED unset until reviewed configuration is confirmed. Activation requires it to be 1 at both preflight and production job; do not rely on this flag as approval.
4. Add environment-scoped PRODUCTION_MIGRATION_DATABASE_URL and PRODUCTION_DATABASE_CA_CERT secrets, with minimum database privileges. Configure PRODUCTION_DB_HOST/PORT/NAME/USER independently. Never put these values in code or logs. TLS certificate validation is mandatory. Connection URL options are refused; port/user/database must match approved identity.
5. Vercel currently tracks main and auto-assigns production domains. Before merging, arrange an approved pause of production Git deployments or a controlled deployment/promotion policy. Turning off domain assignment alone does not prevent a production build or database access.
6. Vercel DATABASE_URL currently has All Environments scope. Its actual destination was not revealed or queried. Remove shared production credentials from Preview/Development and configure separate isolated test credentials. Check SUPABASE_SERVICE_ROLE_KEY and all public Supabase endpoints as well. This separation is BLOCKED until settings and non-secret destination identities are confirmed. Do not test preview writes before confirmation.

## Three separate approvals

Merge approval authorizes only reviewed code integration after protections and CI are verified. Migration approval authorizes a reviewed immutable SHA and exact pending SQL/checksum plan. Deployment approval authorizes the application artifact/commit and production domain promotion after database compatibility is verified. None implies the others.

## Manual migration procedure after future approval

1. Back up database plus schema_migrations and object storage; prove restore in an isolated PostgreSQL 16 database. Record approved recovery point, current application commit and schema inventory. Establish a write-free maintenance window if required by the SQL.
2. An independently authorized read-only audit must obtain destination identity and schema_migrations. Compute ledger SHA256 using exported ledgerHash(rows). Compute pending plan SHA256 over JSON of sorted pending {filename,checksum} entries from inventory(). Review the exact SQL and executionSql(002) transformation. No automatic plan discovery against production is provided by this PR.
3. Dispatch the manual workflow from main, with its exact 40-character commit SHA, approved ledger hash and pending plan hash. SHA must equal the dispatch workflow commit. Reviewer approves the production environment for that run.
4. Preflight checks main protection and reviewer/self-review/bypass configuration. Runtime verifies connection identity, strict TLS, existing ledger, every historical checksum, reviewed plan hashes and an advisory lock. Missing/changed configuration refuses execution. Fresh production provisioning is explicitly refused and needs a separate reviewed procedure.
5. Apply pending files in the existing runner's sort order, one transaction each, and verify the final ledger. Do not dispatch normal db:migrate directly against production: it remains the installer for controlled local environments and is not the protected workflow.
6. On failure stop and examine which migrations committed. Database transactions roll back only the current file. Application rollback does not undo database changes. Prefer reviewed forward repair; restoration requires separate approval and reconciliation of writes after the backup. Never run destructive down-migrations automatically.
7. After separate deployment approval, deploy the tested application SHA and check login, authorization, task writes, uploads and network behavior. A rollback must use a schema-compatible prior application version.

## Manual device checks still required

Windows EXE: Driver login/logout, session refresh, close/reopen, app:// API proxy/CORS, .html navigation, offline failure/retry, Driver A/B isolation, files, and idle traffic.

Android APK: login/logout/refresh, background/resume, Capacitor navigation, file/camera permissions, uploads/downloads, offline retry, authorization and idle traffic. Successful artifact builds do not prove these device flows.

## Limits

Settings are instructions only and have not been changed. Protection failure must never be bypassed to make the workflow run. CI validates the runner against local PostgreSQL and mock configurations; it never dispatches the production workflow or uses production secrets. The Vercel wrapper invokes only npm run build; application build-time code or future imports can still introduce database access and must be reviewed separately. Preview database identity remains unverified until settings separation is confirmed.
