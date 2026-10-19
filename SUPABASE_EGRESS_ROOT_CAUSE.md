# Supabase Egress Root-Cause Audit

## Verified from code

1. Kanban row loading is paginated and the API caps a requested page at 500 rows. Status-count requests use a distinct `statusColumnId` path and must not be counted as row pages.
2. Realtime has fallback refresh paths. The main candidates are TableBoard task/chat fallbacks, notifications, Driver Trips, and portal refreshes.
3. Workspace/home components prefetch and refresh data; these need request deduplication and idle/background measurement.
4. The scan found 77 `SELECT *` text matches. This is not proof that all are large or executed; each match needs query-level classification before changing it.

## Historical database signals supplied for this audit

The supplied cumulative figures (permission checks, task-by-ID reads, workspace lookups, notifications, row `SELECT *`, and metadata introspection) cannot be converted into daily GB without query text, execution counts over a bounded interval, row/byte distributions, and Supabase egress breakdown. They are therefore hypotheses, not current daily measurements.

## Ranked hypotheses — not measured yet

| Priority | Hypothesis | Why it is plausible | Required proof |
|---|---|---|---|
| P0 | Repeated row/task reads and large result sets | task and workspace paths are high fan-out | request counts, response bytes, pg_stat_statements interval |
| P0 | Fallback polling while Realtime is unhealthy | several 8–30s fallback timers exist | browser hidden/visible and Realtime status scenarios |
| P1 | Metadata/schema introspection repetition | many modules discover schema/visibility | query fingerprint counts and cache hit rate |
| P1 | Storage/download payloads | files and PDFs are byte-heavy | Storage transfer logs and fixture sizes |
| P2 | Shared server/jobs traffic | jobs and sockets are not tenant-local | job attribution and common-service split |

No optimization is declared complete until a BASE/HEAD measurement proves lower bytes without functional regression.
