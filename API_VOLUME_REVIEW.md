# Request-local notification permission read deduplication

Notification responses can authorize 20 different tasks on the same board and repeat the same board/membership query 20 times. The GET handler now owns a bounded read wrapper that coalesces identical SELECT SQL plus parameters. Every authorization decision still runs; only duplicate reads within that invocation share results. A new request starts with an empty map. Failures evict cached reads; writes clear the map. No frontend response cache, cross-user cache, RLS or permissions change is introduced.

The existing in-flight frontend GET deduplication, hidden-tab checks, batching of workspace notification enrichment and per-notification row/board maps were inspected and retained.

The Chromium workflow builds BASE (original notification handler) and HEAD, uses the same isolated PostgreSQL data for two tenants, authenticates through real login, reads 20 task notifications ten times per tenant, verifies ownership and cross-tenant denial, records p50/p95, response bytes, browser transfer sizes when available, pg_stat_statements deltas and 15s idle on the login page. This idle scope is not application-wide idle coverage. It produces CSV and JSON artifacts even on failure. Supabase billing and PostgreSQL wire bytes remain UNKNOWN. Measurements are pending until this workflow passes.

Rollback: revert the application commit; no migration or data restoration required. Full-table fallback polling and Realtime reconnect need their own measured change; they are not modified here.
