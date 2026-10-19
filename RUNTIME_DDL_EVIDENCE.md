# Runtime DDL removal — review evidence

Scope: automation GET/POST prerequisite repair and duplicated automation ID-type introspection. No Production operation is included.

Migration 044 copies the existing additive repair SQL out of the request handler. Existing IDs, data, policies and grants are retained. Apply through the controlled migration workflow before deploying the application. Legacy SERIAL IDs remain supported. Missing schema produces an error rather than silently repairing Production during a request.

ID type discovery is shared per pool with a 60-second lifetime and concurrent promise deduplication. Errors evict the entry. It contains schema metadata only, never authorization decisions. Schema changes can take up to 60 seconds to be rediscovered.

Local validation: 16 tests passed, including automation builder behavior, migration 002 historical integrity, no automation-route DDL, concurrent metadata discovery, distinct pools and retry after discovery failure.

CI `Runtime DDL regression and benchmark` runs the full migration chain on PostgreSQL 17, tests a legacy SERIAL fixture with a retained row, applies migration 044 twice, then measures 20 executions of the previous schema prerequisite. `benchmark.json` records actual round trips and elapsed time. This measures prerequisite overhead, not route latency, PostgreSQL wire bytes or Supabase billing. Results are pending until the workflow completes.

Rollback: revert the application commit. Keep additive columns/indexes; do not drop tables or data. The old application remains compatible with the expanded schema. No automatic destructive down migration is supplied.

Remaining runtime DDL found by static scan: audit.js, twoFactor.js, passwordReset.js, entitlements.js, logistics.js, publicShareSecurity.js, server.js, marketplace reporting, portal comments, public-share, invoice-branding, notification preferences, webhooks and two-factor routes. These are NOT covered by the automation-route regression guard yet. Their removal requires preserving each feature's migration prerequisite and tests. The wider task is incomplete until these are addressed.
