DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS saved_filters;
DROP TABLE IF EXISTS dashboard_widgets;
DROP TABLE IF EXISTS dashboards;
DROP TABLE IF EXISTS row_relations;
DROP TABLE IF EXISTS board_views;
DROP TABLE IF EXISTS workspace_modules;

ALTER TABLE rows
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS assigned_user_ids,
  DROP COLUMN IF EXISTS position,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS group_id;

ALTER TABLE tables
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS default_view_id,
  DROP COLUMN IF EXISTS settings,
  DROP COLUMN IF EXISTS icon,
  DROP COLUMN IF EXISTS description;

ALTER TABLE workspaces
  DROP COLUMN IF EXISTS settings,
  DROP COLUMN IF EXISTS enabled_modules,
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS icon,
  DROP COLUMN IF EXISTS description;
