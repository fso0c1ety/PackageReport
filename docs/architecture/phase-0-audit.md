# Phase 0 audit and safety baseline

## Current architecture

- Next.js application with App Router UI and API routes under `src/app/api`.
- PostgreSQL/Supabase persistence with a compatibility-oriented JSONB board model.
- Express compatibility server under `server/` for legacy and desktop clients.
- Core hierarchy is workspace -> table/board -> row -> JSON cell data, with newer normalized `board_columns` and `cell_values` tables introduced incrementally.
- Authentication uses signed tokens plus optional email 2FA. Table permission checks preserve legacy shared-user entries.
- Comments, files, activity, notifications, automations, billing, calendar, public sharing and API keys already have dedicated routes or services.
- Large table rendering uses TanStack Virtual; a 10,000-row viewport regression test exists.

## Compatibility constraints

The existing `tables`, `rows`, JSON column definitions and shared-user formats remain the source of truth until a later compatibility migration is tested. New universal entities must be additive. No Phase 0 migration renames or deletes existing columns, tables or data.

## Logistics coupling found

AGS/logistics wording and template definitions exist mainly in template manifests, seed/default board creation, dashboard labels and UI examples. Core CRUD routes generally operate on tables, rows and dynamic columns. Later phases should route template-specific defaults through manifests and keep generic CRUD services unaware of loads, trucks, pickup or delivery.

## Migration policy

1. Schema changes are additive and transactional.
2. Applied SQL is recorded with SHA-256 checksum and duration.
3. An applied migration must never be edited; create a new migration instead.
4. A production backup is required before destructive or data-transforming migrations.
5. Future destructive migrations require a tested companion rollback script and validation on staging.
6. Data backfills must be idempotent, batched and measurable.
7. Feature flags remain off until regression, build and live staging checks pass.

## Phase 0 risks and follow-up

- Legacy Express and Next API implementations overlap and need endpoint-by-endpoint consolidation later.
- Existing historical migrations include duplicate sequence `004`; this must be renumbered only through a compatibility-safe migration-log procedure, never by silently renaming an applied production file.
- Full database rollback cannot safely be claimed for historical migrations that predate rollback scripts. Phase 0 therefore adds integrity validation and establishes the rollback requirement for future migrations.
- File upload and notification end-to-end tests require isolated storage/mail test doubles before they can run safely in CI.

## Release gate for every phase

Run typecheck, lint, automated tests and production build. Then test the affected flows in the deployed environment behind their feature flags. Only enable a flag after the existing AGS workspace and the new behavior both pass.
