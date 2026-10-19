# Guarded index optimization

Read-only Production catalog snapshot (2026-10-19, PostgreSQL 17.6): 145 public indexes inventoried with definitions, expressions, predicates, key/include counts, opclasses, collations, sort options, validity, size, usage and dependencies. No Production DDL was executed. stats_reset is NULL: scan counts do not establish a known observation window.

Decisions are in docs/index-advisor/catalog-inventory.json. Constraint-backed, unique, authorization and used indexes are retained unless an exact verified equivalent survives. Zero scans alone never justify removal. The strict non-partial FK coverage query returned 21 candidates, not the advisor's earlier 18: its conservative coverage rule excludes partial indexes; these counts are not equivalent. FK decisions are recorded individually.

Proposed ADD: uploaded_files(workspace_id), for referencing-row lookup and workspace ON DELETE CASCADE. Other FK candidates remain INVESTIGATE; no blanket index creation.

Proposed REMOVE, conditional on local plans and execution-time equality/dependency guards: idx_rows_table_id, idx_rows_table_id_base, idx_tables_workspace_id_base, idx_uploaded_files_row_id, uploaded_files_table_id_idx. Surviving equivalents: rows_table_id_scheduled_idx, idx_tables_workspace_id, uploaded_files_row_id_idx, idx_uploaded_files_table_id. Production rows indexes share text_ops/default collation and identical definitions, yet the scheduled index is 81920 bytes versus 851968 bytes for each older copy; it has 93638 recorded scans. Size is observed, not a proven bloat diagnosis.

Migration 045 adds the single FK index; 046 validates exact catalog signatures, predicates, uniqueness, access method, storage options, tablespace, readiness, replication identity and incoming dependencies before DROP INDEX RESTRICT. Missing survivor or drift aborts the transaction. Historical migrations are unchanged. Sequence 044 is reserved by a separate unmerged automation PR; recheck numbering before integration.

Locking: the existing runner wraps each migration in BEGIN/COMMIT; CONCURRENTLY is unsupported. CREATE INDEX blocks writes while building; DROP INDEX can require ACCESS EXCLUSIVE. lock_timeout=3s and statement_timeout=60s bound individual operations but do not guarantee a maintenance duration. Future execution needs a separately approved write window. Do not run this migration opportunistically during customer traffic.

Rollback: in a controlled transaction execute server/db/rollbacks/046_guarded_duplicate_indexes.down.sql then 045_uploaded_files_workspace_fk_index.down.sql. This recreates indexes, not data. It also takes locks. Rollback scripts do not rewrite migration history; a controlled forward reconciliation is needed before reapplying recorded versions.

CI tests 100000 rows/files and 1000 workspace/board parents; captures EXPLAIN ANALYZE BUFFERS and p50/p95 for four retained-index lookups, workspace-file lookup and actual parent deletion in rolled-back savepoints. Verifies ordered results, constraints/ACL/RLS metadata, idempotence, rollback and refusal of predicate drift. Then runs the full clean migration chain and permission regressions. Actual numeric results remain pending until CI completes. Artifacts upload even on failure.

The Supabase hosted advisor engine cannot target this local PostgreSQL service through the available connector. Local catalog verification is used; hosted-advisor parity and Production plan/latency outcomes remain UNKNOWN.
