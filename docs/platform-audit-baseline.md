# Smart Manage Platform Audit and Baseline

Date: 2026-08-03  
Branch: `codex/platform-phase-1-audit`

## Scope

This report covers only the audit and baseline requested by the platform plan. No product behavior, database schema, or API contract was changed.

## Baseline results

| Check | Result |
| --- | --- |
| Dependency install | Timed out after 120 seconds; existing `node_modules` remained usable |
| TypeScript | Passed (`tsc --noEmit`) |
| ESLint | Passed with one warning in `src/app/TableBoard.tsx` for TanStack Virtual and React Compiler compatibility |
| Tests | Passed: 89/89 |
| Production build | Passed; 75 pages generated and Capacitor web assets prepared |

The test runner also reports a non-blocking Node warning because JavaScript tests use ESM syntax while `package.json` does not declare a module type.

## Current architecture

### Frontend and clients

- Next.js 16 App Router with React 19 and TypeScript.
- Browser deployment uses Vercel and 83 Next API route handlers under `src/app/api`.
- Capacitor packages the static `out` directory for Android and iOS.
- Electron uses `electron/main.js` and packages `out` for Windows.
- Authentication state is stored in browser `localStorage`; API requests attach a bearer JWT.

### Backend

- The hosted Vercel application uses Next route handlers under `src/app/api`.
- A second Express/Socket.IO backend starts through `server/index.js` and delegates to the 2,918-line `server/server.js`.
- Nine Express routers have already been extracted, but users, workspaces, tables, rows, notifications, uploads, and socket behavior remain largely inline.
- Express and Next contain overlapping implementations of authentication, tables, workspaces, uploads, notifications, and other domains.

### Database and migrations

- PostgreSQL via `pg`, currently backed by Supabase infrastructure.
- SQL migrations are in `server/db/migrations`, with checksum tracking in `schema_migrations`.
- Migrations cover the legacy schema through logistics driver portal changes and performance indexes.
- Some request paths still run compatibility `ALTER TABLE ... IF NOT EXISTS` operations at runtime; schema changes should be migration-only.

### Realtime and jobs

- Socket.IO rooms and presence are implemented inside `server/server.js`.
- Presence, offers, and socket mappings are stored in process memory.
- A scheduled-message poller also runs in the web process.
- These designs work on one process but are not safe for horizontal scaling or serverless execution.

### Uploads

- The Express path writes uploads to both local disk and PostgreSQL binary storage.
- Static `/uploads` exposure and the fallback file route do not consistently enforce workspace/table authorization.
- MIME allowlists and size limits exist, but signature validation, ownership metadata, checksums, lifecycle policy, and private signed delivery are incomplete.

## Priority findings

### Critical

1. `src/app/api/_lib/server.js` contains a tracked database connection fallback and a weak JWT fallback. Remove both, rotate the exposed database credential, rotate the JWT secret, and require environment variables at startup.
2. Authorization is not expressed through one canonical policy layer. The Express and Next paths can make different access decisions for equivalent operations.
3. Socket identity is not consistently bound to the verified JWT. In particular, client-supplied registration and room/call identifiers need server-side ownership checks.

### High

1. `server/server.js` is a 2,918-line composition of boot logic, routes, sockets, uploads, schema repair, and polling jobs.
2. Next API and Express duplicate business behavior, increasing regression and security drift risk.
3. Process-memory realtime state will be lost on restart and cannot coordinate multiple instances.
4. Upload retrieval can bypass record-level authorization, and local disk is not durable in serverless deployments.
5. JWT access tokens last 24 hours and are stored in `localStorage`; there is no refresh-token rotation or server-side session revocation.

### Medium

1. CORS is configured in multiple places and the Next configuration applies a wildcard origin before proxy refinement.
2. Runtime schema-repair paths remain alongside formal migrations.
3. `TableBoard.tsx` is large enough for Babel to deoptimize code generation and generates the only lint warning.
4. Test coverage is mainly deterministic engine/unit coverage; API integration, tenant isolation, socket authorization, upload security, and end-to-end portal flows need dedicated coverage.
5. The dependency install did not finish within the audit timeout, although all checks passed against the existing dependency tree.

## Exact Phase 1 implementation plan

Phase 1 will modularize the Express backend without changing API paths or response contracts. The Vercel Next API remains operational while contract parity is documented.

### New composition files

- `server/app.js`: create and configure Express, shared middleware, route mounting, Next fallback, and the error boundary.
- `server/httpServer.js`: create the HTTP server and attach Socket.IO.
- `server/bootstrap.js`: validate environment, optionally run migrations, start jobs, and listen.
- `server/config/cors.js`: one allowlist and origin policy for Express.
- `server/config/socket.js`: Socket.IO transport, CORS, and adapter settings.
- `server/middleware/errorHandler.js`: normalized error payloads and structured logging.
- `server/middleware/notFound.js`: explicit API 404 handling before the Next fallback.

### Socket extraction

- `server/socket/index.js`: authenticated socket initialization and handler registration.
- `server/socket/identity.js`: bind socket identity exclusively to the verified JWT.
- `server/socket/rooms.js`: authorized workspace/table/task room joins.
- `server/socket/presence.js`: presence abstraction, initially preserving current behavior behind an interface.
- `server/socket/calls.js`: call signaling with target and workspace authorization.

### Route extraction

- `server/routes/users.js`: profile endpoints.
- `server/routes/workspaces.js`: workspace CRUD, membership, modules, and invitations.
- `server/routes/tables.js`: table CRUD, sharing, document content, and columns.
- `server/routes/rows.js`: row CRUD, ordering, archive, and batch operations.
- `server/routes/notifications.js`: notification reads, updates, and mark-read actions.
- `server/routes/uploads.js`: upload metadata and private retrieval contracts.

Each route file will call existing services/repositories first. SQL will not be copied into controllers when an existing repository can own it.

### Services and repositories

- `server/services/workspaceService.js`: workspace orchestration only.
- `server/services/uploadService.js`: upload validation and storage abstraction.
- `server/services/notificationService.js`: notification orchestration.
- `server/repositories/workspaceRepository.js`: workspace/member persistence.
- `server/repositories/uploadRepository.js`: upload metadata and binary compatibility persistence.
- `server/repositories/notificationRepository.js`: notification persistence.

### Jobs and compatibility

- `server/jobs/scheduledMessages.js`: move scheduled-message polling out of the web entry file, preserving the current schedule for Phase 1.
- `server/server.js`: temporarily become a compatibility wrapper delegating to the new bootstrap, then be removed after parity tests pass.
- `server/index.js`: call the new bootstrap and handle fatal startup errors.

### Tests added before extraction

- `test/server-route-contracts.test.js`: snapshot status codes and response shapes for moved routes.
- `test/server-auth-boundaries.test.js`: verify anonymous, viewer, editor, admin, and owner boundaries.
- `test/socket-authorization.test.js`: reject spoofed identity and unauthorized room joins.
- `test/upload-authorization.test.js`: reject cross-workspace file reads.
- `test/server-bootstrap.test.js`: verify startup ordering and migration gating.

### Phase 1 commit sequence

1. Add contract and authorization tests around existing behavior.
2. Add environment validation and remove insecure fallbacks; rotate secrets outside git before deployment.
3. Extract app/bootstrap/error handling without moving domain routes.
4. Extract sockets and bind identity to JWT.
5. Extract users/workspaces/tables/rows routes in small commits.
6. Extract notifications/uploads/jobs.
7. Convert `server/server.js` to a compatibility wrapper.
8. Run typecheck, lint, tests, build, migration validation, and API smoke tests.

## Phase 1 exit criteria

- Existing public API paths and response shapes remain compatible.
- No route or socket event trusts client-supplied identity.
- No secret or credential fallback remains in tracked source.
- `server/server.js` no longer contains domain implementation.
- All baseline checks pass and new authorization/contract tests pass.
- Existing user workspaces, rows, columns, permissions, and logistics data remain unchanged.

