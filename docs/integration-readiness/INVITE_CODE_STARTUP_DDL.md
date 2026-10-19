# Invite-code startup DDL removal

`server/server.js` previously attempted `ALTER TABLE tables ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE` when `RUN_STARTUP_MIGRATIONS=true`. The column is already owned by migration 001, so the startup DDL was removed.

The existing narrowly scoped legacy backfill remains data-only: it reads rows with a NULL invite code and updates only those rows. It is not schema repair and is retained to preserve existing behavior for installations that already have the migration-applied column. Missing schema fails safely inside the existing guarded backfill path.

Rollback is a code revert. Production adoption requires the approved migration workflow to confirm migration 001 before enabling any legacy backfill.
