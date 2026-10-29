# Bounded realtime fallback recovery

When realtime is unavailable, the fallback performs a bounded, sequential snapshot of the pages already loaded in the board (at least the first 100 rows) every 15 seconds. It replaces the loaded snapshot atomically, so successful empty responses remove rows that are no longer visible or authorized, while any failed page preserves the last valid state. It does not fetch an unbounded full table. Hidden tabs, overlapping requests, optimistic pending cell values, realtime updates and the existing stop-on-subscription behavior remain intact.

The recovery target is derived from the number of currently loaded rows, not from the total table size. A successful empty first page clears the board; a failed later page aborts the snapshot without applying partial results. This keeps pagination bounded while allowing deletes and authorization changes to remove stale rows on the next successful recovery.

This is intentionally a separate Draft PR. It does not change migrations, RLS, permissions, API contracts, or Production. Deletes and updates received through realtime remain authoritative; a full resynchronization is still performed by the normal paginated board loading path when the user opens or reloads the board. Supabase billed Egress remains UNKNOWN until official billing measurements are available.
