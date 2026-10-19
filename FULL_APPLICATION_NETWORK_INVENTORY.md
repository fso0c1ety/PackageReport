# Smart Manage — Full Application Network Inventory

Audit branch: `audit/egress-network-2026-10-17`  
Base: `origin/main` at the audit start  
Scope: static repository inventory; no Production writes, migrations, statistics reset, or load test.

## Evidence boundary

Static scan found 474 files under `src`, `server`, `electron`, `scripts`, and `e2e`; 109 Next API route files; 234 `authenticatedFetch` references; 37 direct `fetch` references; 77 `SELECT *` text matches; 20 `setInterval` references; and 7 `supabase.channel` references. These are code counts, not network bytes or Supabase billing metrics.

## Functional inventory

| Area | Representative routes/components | Data/network surfaces | Status |
|---|---|---|---|
| Public/auth | `/`, `/login`, `/register`, `/forgot-password`, `/reset-password` | auth/session APIs, cookies, email | code-present; runtime measurement pending |
| Workspace/dashboard | `/home`, `/workspace`, `/dashboard`, `/my-work` | workspaces, tables, metadata, prefetch/cache | code-present; runtime measurement pending |
| Tables/Kanban | `/api/tables`, `/api/tables/[tableId]/tasks`, `TableBoard.tsx` | paginated rows, status counts, Realtime/fallbacks | code-present; E2E exists |
| Calendar/notifications | calendar APIs, `notifications`, reminders | API reads, Realtime and fallback refresh | code-present; runtime measurement pending |
| Files/import/export | upload, secure downloads, Excel import/export, invoice PDFs | Storage/file payloads, signed URLs | code-present; runtime measurement pending |
| Search/filters | `/api/search`, dashboard/table filters | query requests and result payloads | code-present; runtime measurement pending |
| Billing/marketplace | billing checkout/status/webhook, marketplace routes | payment provider and DB/API calls | code-present; production measurement pending |
| Portals | professional/driver/public board APIs | tenant-scoped reads/writes, Realtime | code-present; READY/PARTIAL/SHELL must be tested per fixture |
| Background/server | `server/jobs`, scheduled automation/messages, socket presence | timers, DB jobs, websocket/polling | code-present; production attribution pending |
| Desktop/mobile | `electron/main.js`, Capacitor paths | updater, native storage, API calls | code-present; device measurement pending |

## Static hotspots requiring measurement

- `src/app/TableBoard.tsx`: task/chat polling fallbacks and paginated row loading.
- `src/app/(dashboard)/home/HomeDashboard.tsx`: 30-second refresh path and prefetch.
- `src/app/(dashboard)/driver-trips/page.tsx`: 15-second fallback paths when Realtime is unhealthy.
- `src/app/TopBar.tsx` and notification helpers: notification fallback refresh.
- `server/jobs/*` and `server/socket/*`: server-side timers and presence refresh.
- `src/app/api/tables/[tableId]/tasks/route.js`: bounded page size is capped at 500; status-count requests are a separate response path.

## Measurement gaps

Repository inspection cannot prove Supabase egress, Vercel transfer, cache hit rate, Storage bytes, Realtime bytes, or tenant attribution. Those require authenticated telemetry/log exports or an isolated test environment with request/response instrumentation.
