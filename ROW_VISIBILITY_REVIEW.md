# Candidate: narrow pagination before row materialization

The tasks query previously carried all row columns through the window count and sort. The candidate selects page IDs, sort keys and exact visible totals first, then joins the limited page back to rows. The join also retains table_id. The existing visibility predicate, parameter positions, OFFSET, exact total, stable ordering and response fields remain unchanged. Historical migration 022 and RLS are unchanged. No new indexes are proposed before plan evidence.

The benchmark uses PostgreSQL 17 with 20,000 wide synthetic records split across two boards, eight record scopes and two offsets. It captures ten sequential query timings, p50/p95 and EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) for BASE and HEAD and requires identical results. Query counts remain one per page. SQL board boundaries are asserted; this is not a replacement for authenticated cross-tenant API tests.

BASE is f21e6d3 (current origin/main at branch creation). Results are pending CI; no latency improvement is claimed yet. Current local task-read unit tests pass. Other table-list/search/my-work queries were inspected and retain their existing visibility predicate; they are not optimized by this candidate. Task-by-ID and repeated membership reads remain outside this change.

Rollback: revert the application commit. No migration, index removal or data restoration is needed. A possible extra primary-key join cost is measured rather than assumed beneficial. The candidate must not be merged if latency or correctness regresses.
