const { createHash } = require('node:crypto');

// Opt-in contract; existing API callers retain their response shape.
// Each authorization, revision and page is read from one PostgreSQL snapshot.
async function consistentTaskPage({ pool, userId, tableId, searchParams, requireBoardPermission, recordAccessQueryContext, normalizePeopleValues = (_columns, values) => values }) {
  const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit')) || 100));
  const offset = Number(searchParams.get('offset') || 0);
  const expected = searchParams.get('revision');
  const columnId = searchParams.get('statusColumnId') || '';
  const status = searchParams.has('statusValue') ? searchParams.get('statusValue') : null;
  const counts = searchParams.get('includeCounts') === '1';
  if (!Number.isInteger(limit) || !Number.isSafeInteger(offset) || offset < 0 || (offset > 0 && !expected)) {
    return { status: 400, body: { error: 'A subsequent page requires its revision and a valid offset' } };
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const board = await requireBoardPermission(client, userId, tableId, 'viewer');
    if (!board) return { status: 404, body: { error: 'Table not found or forbidden' } };
    const column = (board.columns || []).find(item => String(item.id) === columnId);
    if ((columnId && column?.type !== 'Status') || (status !== null && !columnId)) {
      return { status: 400, body: { error: 'Invalid status column' } };
    }
    const access = recordAccessQueryContext(board, userId);
    const unrestricted = access.access?.scope === 'all_permitted';
    if (!unrestricted && board.legacy_authorization) {
      const capability = await client.query("SELECT to_regprocedure('smart_manage_row_visible(jsonb,text,text,jsonb,text,jsonb,text,text,text)') IS NOT NULL AS supported");
      if (!capability.rows[0].supported) return { status: 503, body: { error: 'Consistent pagination requires the existing row-visibility function', code: 'CONSISTENT_PAGINATION_UNAVAILABLE' } };
    }
    const scope = createHash('sha256').update(JSON.stringify({ userId, tableId, workspaceId: board.workspace_id, board, access })).digest('hex');
    const params = [tableId, columnId, status, expected, offset, limit, scope, counts];
    let where = 'r.table_id=$1';
    if (!unrestricted) {
      params.push(JSON.stringify(access.columns), String(access.userId), JSON.stringify(access.access), access.teamId, access.departmentId, access.companyId);
      where += ' AND smart_manage_row_visible(r.values,r.id::text,r.created_by::text,$9::jsonb,$10::text,$11::jsonb,$12::text,$13::text,$14::text)';
    }
    // Only compact identity/version metadata is aggregated. Task payloads are
    // bounded by LIMIT and never transferred for an invalid revision.
    const result = await client.query(`WITH visible AS MATERIALIZED (
      SELECT r.id, r.xmin::text AS version, COALESCE(r.values->>$2,'') AS status
      FROM rows r WHERE ${where}
    ), metadata AS (
      SELECT md5($7 || COALESCE(string_agg(id::text || ':' || version, ',' ORDER BY id),'')) AS revision,
        COUNT(*) FILTER (WHERE $3::text IS NULL OR status=$3)::int AS total
      FROM visible
    )
    SELECT CASE WHEN row_number() OVER ()=1 THEN jsonb_build_object(
      'revision',m.revision,'total',m.total,'counts',
      CASE WHEN $8::boolean THEN (SELECT COALESCE(jsonb_object_agg(s.status,s.count),'{}'::jsonb) FROM (SELECT status,COUNT(*)::int count FROM visible GROUP BY status) s) ELSE NULL END
    ) END AS __task_page_metadata,p.*
    FROM metadata m LEFT JOIN LATERAL (
      SELECT r.* FROM rows r
      WHERE ${where} AND ($3::text IS NULL OR COALESCE(r.values->>$2,'')=$3) AND ($4::text IS NULL OR m.revision=$4)
      ORDER BY (r.values->>'order')::int ASC NULLS FIRST, r.created_at DESC, r.id ASC
      LIMIT $6 OFFSET $5
    ) p ON TRUE
    ORDER BY (p.values->>'order')::int ASC NULLS FIRST,p.created_at DESC,p.id ASC`, params);
    const data = result.rows.find(row=>row.__task_page_metadata)?.__task_page_metadata;
    data.rows = result.rows.filter(row=>row.id!==null).map(({__task_page_metadata:_metadata,...row})=>row);
    if (expected && expected !== data.revision) return { status: 409, body: { code: 'TASK_REVISION_CHANGED', error: 'Task snapshot changed' } };
    return { status: 200, board, body: { rows: data.rows.map(row => ({ ...row, values: normalizePeopleValues(board.columns,row.values) })), total: data.total, offset, limit, hasMore: offset + data.rows.length < data.total, revision: data.revision, ...(counts ? { statusCounts: data.counts } : {}) } };
  } finally {
    try { await client.query('ROLLBACK'); } finally { client.release(); }
  }
}
module.exports = { consistentTaskPage };
