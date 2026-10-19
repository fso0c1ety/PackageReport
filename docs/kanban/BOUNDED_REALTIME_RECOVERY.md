# Bounded realtime fallback recovery

When realtime is unavailable, the fallback now requests only the first 100 visible tasks every 15 seconds. It merges those rows into the already loaded local pages instead of replacing the board with a full-table response. Hidden tabs, overlapping requests, optimistic pending cell values, realtime updates and the existing stop-on-subscription behavior remain intact.

This is intentionally a separate Draft PR. It does not change migrations, RLS, permissions, API contracts, or Production. Deletes and updates received through realtime remain authoritative; a full resynchronization is still performed by the normal paginated board loading path when the user opens or reloads the board. Supabase billed Egress remains UNKNOWN until official billing measurements are available.
