# Role Portal End-to-End Audit

Audit date: 2026-08-10

## Scope and terminology

The authorization model intentionally keeps four independent dimensions:

- workspace role: owner, admin, manager, member, guest;
- board role: owner, editor, commenter, viewer;
- professional/job role: driver, doctor, teacher, parent, client and template-specific roles;
- portal type and record scope: the landing experience plus the backend row filter.

A hidden menu is never treated as authorization. Workspace, board, row and file access are checked on the server.

## Readiness matrix

| Experience | Current status | Evidence | Release decision |
| --- | --- | --- | --- |
| Driver | PARTIAL | Dedicated `/driver-trips` UI, logistics context/trips/documents APIs, assigned-driver filtering, status history, notifications and mobile navigation exist. Full authenticated multi-device acceptance testing against an isolated demo database is still required. | Do not use new marketing screenshots until the isolated acceptance run passes. |
| Dispatcher | PARTIAL | Real company workspace/boards and manager-level access exist. There is no dedicated config-driven Dispatcher Portal. | Describe as a restricted company workspace role, not a completed portal. |
| Fleet manager | PARTIAL | Real company workspace/boards and manager-level access exist. There is no dedicated config-driven Fleet Manager Portal. | Describe as a workspace role, not a completed portal. |
| Doctor / dentist | PARTIAL | Template-backed configuration, role navigation, real scoped records and relationship-derived patient isolation exist. Clinical write actions and isolated multi-user QA remain. | Do not advertise or capture yet. |
| Dental assistant | SHELL | Role metadata and compatibility route only. | Do not advertise or capture. |
| Receptionist | SHELL | Role metadata and compatibility route only. | Do not advertise or capture. |
| Patient | PARTIAL | Patient-safe field projection and patient relationship isolation exist over Dental Clinic records. Messaging/write actions and multi-user QA remain. | Do not advertise or capture yet. |
| Teacher / educator | PARTIAL | Kindergarten configuration, group/child relationship isolation, real dashboard records and role navigation exist. Attendance/activity write actions and multi-user QA remain. | Do not advertise or capture yet. |
| Parent | PARTIAL | Parent-child relationship traversal, child-safe field projection and real portal sections exist. Daily-care writeback/messaging and multi-user QA remain. | Do not advertise or capture yet. |
| Client | PARTIAL | Freight Broker configuration, company relationship filtering and server-side internal-field exclusion exist. Messaging and multi-user QA remain. | Do not advertise or capture yet. |
| Sales / account manager | SHELL | Template metadata and compatibility route only. | Do not advertise or capture. |
| Project / site / field worker | SHELL | Template metadata and compatibility route only. | Do not advertise or capture. |
| Store employee / cashier | SHELL | Template metadata and compatibility route only. | Do not advertise or capture. |
| Warehouse worker | SHELL | Template metadata and compatibility route only. | Do not advertise or capture. |
| Production / machine operator | SHELL | Template metadata and compatibility route only. | Do not advertise or capture. |
| HR employee | SHELL | Template metadata and compatibility route only. | Do not advertise or capture. |
| Standard owner/admin/member/guest | READY | Existing authenticated workspace and explicit board authorization paths. These are not profession portals. | Keep separate from portal claims. |

## Security findings and fixes

Fixed during this audit:

- explicit `workspaceId` and `portalType` requests now resolve only an exact assigned membership;
- a missing explicit assignment returns HTTP 403 instead of falling back to another workspace or role;
- the generic portal route asks the server for its exact portal type and consumes only the returned active membership;
- automated tests cover Driver A versus Driver B, Doctor A versus Doctor B, Teacher A versus Teacher B, Client Company A versus Company B, foreign table row lookup and workspace/portal mismatch.

Existing protections verified in source and tests:

- row access is derived from the row's actual table;
- file access is bound to its row, table or workspace;
- owner/admin bypass is explicit; ordinary membership does not automatically grant board access;
- logistics driver trip reads and writes require workspace membership, the driver role, the real Trips/Loads table and `_assignedDriverUserId === currentUser.id`;
- status updates are allow-listed and Loaded/Delivered require confirmation.

## Isolation and test-data policy

No production user, workspace or customer row was created or changed during this audit. Role behavior is validated with deterministic isolated fixtures and source-level route contracts. Live portal acceptance must use `workspaces.is_demo = true`, demo-only accounts and the guarded demo seeder. Credentials must remain environment-only.

## Mobile and responsive status

The Driver UI contains phone-oriented cards, bottom navigation and map/detail layouts. Automated viewport presence tests exist, but a final authenticated iOS/Android interaction pass is still required for geolocation permission, map gestures, upload capture and safe-area behavior. Compatibility shells are responsive layouts only; responsiveness does not make them functionally complete.

## Remaining acceptance work

Before changing Driver from PARTIAL to READY:

1. Provision a fresh isolated Fleet Management demo workspace.
2. Use two demo driver users and one demo dispatcher user.
3. Verify assignment/reassignment and real-time notifications in separate sessions.
4. Verify direct URL/API denial for the second driver.
5. Exercise map/geocoding, location permission persistence, status flow and uploads on phone and desktop.
6. Capture screenshots only after every acceptance step passes.

For every SHELL portal, implement a registry configuration, domain-specific backend endpoints, scoped fixtures, route/API authorization tests and mobile acceptance flow before claiming completion.
