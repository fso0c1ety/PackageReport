# Inline the verified created_by_me predicate

For the explicit created_by_me scope, migration 022 returns row_created_by=current_user_id directly. Tasks reads now execute the equivalent parameterized SQL predicate while retaining table_id filtering and prior board authorization. Other restricted scopes continue to use smart_manage_row_visible. Owner/admin resolution remains in recordAccessQueryContext. No RLS, historical SQL, indexes or response contracts change.

The earlier narrow-page join candidate was rejected by real PostgreSQL measurements: p50 regressed up to 14.87%, with buffer hits rising from 794 to 1094. It is removed.

The PostgreSQL 17 benchmark uses 20,000 synthetic records across two boards, eight scopes, two offsets, ten samples per query and EXPLAIN (ANALYZE, BUFFERS). It requires identical ordered results and totals. This validates SQL board boundaries; authenticated cross-tenant API tests remain a separate requirement. BASE is f21e6d3. Final candidate measurements are pending CI.

Local task-read tests passed. Regression tests verify the board/user predicates and unchanged pagination; broader permission tests cover role definitions. SQL counts remain one per page. No claim is made about Supabase billed egress.

Rollback: revert the application commit. No SQL rollback, data restoration or migration is required.

Remaining scope: task-by-ID repetition, membership-query deduplication and search/table-list/my-work plans are not optimized here. They retain existing authorization. No global authorization cache is introduced.
