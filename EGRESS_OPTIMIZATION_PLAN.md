# Egress Optimization Plan

## Measure first

1. Capture BASE for the 16 requested scenarios in an isolated fixture environment.
2. Correlate browser requests with server route/query fingerprints and Realtime events.
3. Use bounded read-only `pg_stat_statements` snapshots only if authorized; do not reset statistics or run large `SELECT *` queries in Production.
4. Compare Supabase official egress metrics with application-level byte estimates and label discrepancies.

## Candidate changes after evidence

- Keep Kanban sequential pagination, deduplication, bounded pages, and board-switch cancellation.
- Cache/deduplicate workspace metadata and permission lookups per request/runtime scope.
- Replace large projections only where the API contract and authorization tests prove equivalence.
- Disable fallback polling while the tab is hidden; recover on visibility/online/Reatime state changes.
- Batch notification/schema reads where query fingerprints show repetition.
- Keep Storage downloads signed and avoid re-downloading unchanged objects.
- Do not modify RLS, grants, migrations, or Production configuration as part of measurement.

Every change needs: BASE bytes, HEAD bytes, functional tests, tenant-isolation tests, and rollback commit.
