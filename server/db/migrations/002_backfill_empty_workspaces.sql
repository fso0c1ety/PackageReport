-- Backfill default boards for workspaces that were created before table creation succeeded.
INSERT INTO tables (id, name, workspace_id, columns, created_at, invite_code)
SELECT
  gen_random_uuid()::text,
  COALESCE(NULLIF(w.name, ''), 'Workspace') || ' Table',
  w.id,
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Text', 'type', 'Text', 'order', 0),
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'name', 'Status',
      'type', 'Status',
      'order', 1,
      'options', jsonb_build_array(
        jsonb_build_object('value', 'Started', 'color', '#1976d2'),
        jsonb_build_object('value', 'Working on it', 'color', '#fdab3d'),
        jsonb_build_object('value', 'Done', 'color', '#00c875')
      )
    ),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Date', 'type', 'Date', 'order', 2)
  ),
  EXTRACT(EPOCH FROM NOW()) * 1000,
  UPPER(SUBSTRING(md5(random()::text || w.id) FROM 1 FOR 6))
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM tables t WHERE t.workspace_id = w.id
);