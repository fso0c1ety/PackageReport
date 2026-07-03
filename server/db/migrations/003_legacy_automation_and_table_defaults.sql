-- Compatibility fixes for legacy board UI and automation routes.

ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS trigger_col TEXT,
  ADD COLUMN IF NOT EXISTS cols JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recipients JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS task_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'email';

UPDATE tables
SET columns = jsonb_build_array(
  jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Task', 'type', 'Text', 'order', 0),
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', 'Status',
    'type', 'Status',
    'order', 1,
    'options', jsonb_build_array(
      jsonb_build_object('value', 'Not Started', 'color', '#c4c4c4'),
      jsonb_build_object('value', 'Working on it', 'color', '#fdab3d'),
      jsonb_build_object('value', 'Stuck', 'color', '#e2445c'),
      jsonb_build_object('value', 'Done', 'color', '#00c875')
    )
  ),
  jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Due Date', 'type', 'Date', 'order', 2),
  jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Owner', 'type', 'People', 'order', 3)
)
WHERE columns IS NULL
   OR columns = '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_automations_table_enabled ON automations(table_id, enabled);
CREATE INDEX IF NOT EXISTS idx_automations_task_ids ON automations USING GIN(task_ids);