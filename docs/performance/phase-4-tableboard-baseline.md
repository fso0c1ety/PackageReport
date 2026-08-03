# Phase 4 TableBoard performance baseline

## Baseline audit

- The board already uses `@tanstack/react-virtual` with 12 desktop and 18 mobile overscan rows.
- A 10,000-row contract test confirms the active DOM stays bounded to the viewport.
- Initial loading uses 100-row first paint followed by 500-row range pages.
- Chat, files and activity are loaded when their panel is opened rather than for every initial row.
- Cell editors keep a local draft and commit on blur/Enter; the row store is updated optimistically.
- The previous cell-save request sent the complete row value object even when one value changed.

## Phase 4 result

- Cell persistence now uses `PATCH /tables/:tableId/tasks/:taskId/cells/:columnId`.
- Request size is one cell plus formula-derived values, instead of the complete row.
- The API validates tenant, board, row and column access and returns only the changed row/version.
- Optimistic rollback remains scoped to the affected cell and uses a per-cell save version to avoid stale response rollback.
- Realtime payloads remain row-scoped and include the updated entity without a full board refetch.

## Repeatable targets

- Active rendered rows: viewport plus overscan (normally 30–80).
- First paint: 100 rows maximum.
- Range fetch: 500 rows maximum.
- Cell update: a single PATCH without board reload.
- Typing: local editor state; no network request per keystroke.
