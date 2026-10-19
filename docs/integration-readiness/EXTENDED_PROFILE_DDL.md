# Extended profile runtime DDL removal

`ensureExtendedUserProfileColumns()` issued `ALTER TABLE public.users` from registration, people, profile, and table-members request paths. The columns are already owned by migration 009 (`first_name`, `last_name`, `birth_date`, `gender`) and migration 018 (`driver_license`, `driver_license_expiry`, `passport`).

The helper and covered callers were removed. API queries and response contracts remain unchanged. Missing schema now fails through the normal query path; it is not repaired silently during a request. No migration history, data, grants, RLS, or tenant checks were changed.

Rollback is a code revert only. Before production adoption, validate clean install, upgrade from a pre-009/pre-018 schema, authenticated A/B tenant isolation, and restored-copy compatibility.
