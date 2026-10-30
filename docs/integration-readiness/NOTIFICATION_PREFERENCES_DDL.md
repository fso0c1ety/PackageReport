# Notification preferences: runtime DDL removal

## Scope

The route previously executed `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences ...` on every authenticated GET and PUT. Migration `034_notification_preferences.sql` already owns this column, so the request path was duplicate runtime DDL.

## Change

The route now performs only the existing user-scoped SELECT/UPDATE. Schema provisioning remains the responsibility of migration 034. No historical migration, checksum, RLS policy, grant, API response, or user data is changed.

## Compatibility and failure mode

An installation missing migration 034 now fails at the existing database operation instead of silently changing schema during a request. The required operational action is to apply the versioned migration through the approved migration workflow; no request-time repair is attempted.

## Rollback

Revert this Draft PR to restore the old request-time DDL behavior. The migration remains unchanged. Before any production adoption, validate clean install, upgrade from a pre-034 schema, authenticated tenant isolation, and the restored-copy requirement separately.
