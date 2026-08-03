-- Universal authorization/portal model. Additive and backwards-compatible:
-- the legacy workspace_members.role and tables.shared_users values remain
-- readable while every membership receives explicit security dimensions.

ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS workspace_role TEXT,
  ADD COLUMN IF NOT EXISTS job_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS portal_type TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS landing_route TEXT,
  ADD COLUMN IF NOT EXISTS record_access JSONB NOT NULL DEFAULT '{"scope":"all_permitted"}'::jsonb,
  ADD COLUMN IF NOT EXISTS navigation JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS allowed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS team_id TEXT,
  ADD COLUMN IF NOT EXISTS department_id TEXT,
  ADD COLUMN IF NOT EXISTS company_id TEXT;

UPDATE workspace_members
SET workspace_role = CASE LOWER(COALESCE(role, 'member'))
  WHEN 'owner' THEN 'owner'
  WHEN 'logistics_admin' THEN 'admin'
  WHEN 'admin' THEN 'admin'
  WHEN 'manager' THEN 'manager'
  WHEN 'guest' THEN 'guest'
  WHEN 'viewer' THEN 'guest'
  WHEN 'client' THEN 'guest'
  ELSE 'member'
END
WHERE workspace_role IS NULL;

UPDATE workspace_members
SET job_roles = CASE LOWER(COALESCE(role, ''))
  WHEN 'driver' THEN '["driver"]'::jsonb
  WHEN 'dispatcher' THEN '["dispatcher"]'::jsonb
  WHEN 'fleet_manager' THEN '["fleet_manager"]'::jsonb
  WHEN 'logistics_admin' THEN '["logistics_admin"]'::jsonb
  WHEN 'client' THEN '["client"]'::jsonb
  WHEN 'employee' THEN '["employee"]'::jsonb
  ELSE job_roles
END
WHERE job_roles = '[]'::jsonb;

UPDATE workspace_members
SET portal_type='driver',
    landing_route='/driver-trips',
    record_access='{"scope":"assigned_to_me","field":"assignedDriverUserId"}'::jsonb
WHERE LOWER(COALESCE(role,''))='driver';

ALTER TABLE workspace_members ALTER COLUMN workspace_role SET DEFAULT 'member';
ALTER TABLE workspace_members ALTER COLUMN workspace_role SET NOT NULL;

CREATE TABLE IF NOT EXISTS workspace_job_roles (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  default_workspace_role TEXT NOT NULL DEFAULT 'member',
  default_portal_type TEXT NOT NULL DEFAULT 'standard',
  default_landing_route TEXT,
  record_access_preset JSONB NOT NULL DEFAULT '{"scope":"all_permitted"}'::jsonb,
  navigation JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, key)
);

CREATE TABLE IF NOT EXISTS board_member_access (
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_role TEXT NOT NULL DEFAULT 'viewer',
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  record_access JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(table_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_workspace_role_idx
  ON workspace_members(workspace_id, workspace_role);
CREATE INDEX IF NOT EXISTS workspace_members_portal_idx
  ON workspace_members(user_id, portal_type);
CREATE INDEX IF NOT EXISTS workspace_job_roles_workspace_idx
  ON workspace_job_roles(workspace_id, enabled);
CREATE INDEX IF NOT EXISTS board_member_access_user_idx
  ON board_member_access(user_id, board_role);

INSERT INTO workspace_job_roles(
  id, workspace_id, key, name, is_system, default_workspace_role,
  default_portal_type, default_landing_route, record_access_preset,
  navigation, allowed_actions
)
SELECT md5(w.id || ':' || role.key), w.id, role.key, role.name, TRUE,
       role.workspace_role, role.portal_type, role.landing_route,
       role.record_access::jsonb, role.navigation::jsonb, role.actions::jsonb
FROM workspaces w
CROSS JOIN (VALUES
  ('employee','Employee','member','standard','/dashboard','{"scope":"all_permitted"}','[]','["view","comment"]'),
  ('driver','Driver','member','driver','/driver-trips','{"scope":"assigned_to_me","field":"assignedDriverUserId"}','["home","my_trips","my_calendar","my_documents","my_expenses","my_fuel","my_profile"]','["view","comment","upload_files","update_approved_status"]'),
  ('dispatcher','Dispatcher','manager','dispatcher','/portal/dispatcher','{"scope":"all_permitted"}','["home","trips","drivers","calendar","documents"]','["view","create","edit","assign","comment","upload_files"]'),
  ('client','Client','guest','client','/portal/client','{"scope":"my_company","field":"clientCompanyId"}','["home","my_records","documents","profile"]','["view","comment","upload_files"]')
) AS role(key,name,workspace_role,portal_type,landing_route,record_access,navigation,actions)
ON CONFLICT(workspace_id,key) DO NOTHING;

INSERT INTO workspace_job_roles(id,workspace_id,key,name,is_system,default_workspace_role,default_portal_type,default_landing_route,record_access_preset)
SELECT md5(w.id || ':' || preset.key),w.id,preset.key,preset.name,TRUE,preset.workspace_role,preset.portal_type,preset.landing_route,preset.record_access::jsonb
FROM workspaces w
CROSS JOIN (VALUES
  ('dental|medical|clinic|pharmacy|laboratory|physiotherapy|veterinary','doctor','Doctor','member','doctor','/portal/doctor','{"scope":"assigned_to_me"}'),
  ('dental','dental_assistant','Dental Assistant','member','dental_assistant','/portal/dental-assistant','{"scope":"assigned_to_me"}'),
  ('dental|medical|clinic','receptionist','Receptionist','member','receptionist','/portal/receptionist','{"scope":"all_permitted"}'),
  ('school|training|student|kindergarten|daycare','teacher','Teacher','member','teacher','/portal/teacher','{"scope":"assigned_to_me"}'),
  ('school|kindergarten|daycare','parent','Parent','guest','parent','/portal/parent','{"scope":"assigned_to_me"}'),
  ('crm|sales|marketing|real_estate','sales_representative','Sales Representative','member','sales','/portal/sales','{"scope":"assigned_to_me"}'),
  ('project|construction|architecture','project_manager','Project Manager','manager','project','/portal/project','{"scope":"my_team"}'),
  ('construction|maintenance_company','field_worker','Field Worker','member','field_worker','/portal/field-worker','{"scope":"assigned_to_me"}'),
  ('retail|store|restaurant|cafe|hotel','store_employee','Store Employee','member','store_employee','/portal/store','{"scope":"assigned_to_me"}'),
  ('warehouse|inventory|distribution','warehouse_worker','Warehouse Worker','member','warehouse','/portal/warehouse','{"scope":"assigned_to_me"}'),
  ('manufacturing|production|machine|quality|raw_material','machine_operator','Machine Operator','member','production','/portal/production','{"scope":"assigned_to_me"}'),
  ('hr|employee|recruitment','employee','Employee','member','hr_employee','/portal/employee','{"scope":"assigned_to_me"}')
) preset(pattern,key,name,workspace_role,portal_type,landing_route,record_access)
WHERE COALESCE(w.template_key,'') ~ preset.pattern
ON CONFLICT(workspace_id,key) DO NOTHING;

CREATE OR REPLACE FUNCTION smart_manage_json_value_matches(actual JSONB, expected TEXT)
RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN actual IS NULL OR expected IS NULL THEN FALSE
    WHEN jsonb_typeof(actual) IN ('string','number','boolean') THEN trim(both '"' from actual::text)=expected
    WHEN jsonb_typeof(actual)='array' THEN
      actual @> jsonb_build_array(to_jsonb(expected))
      OR actual @> jsonb_build_array(jsonb_build_object('id',expected))
      OR actual @> jsonb_build_array(jsonb_build_object('userId',expected))
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(actual) item WHERE smart_manage_json_value_matches(item,expected))
    WHEN jsonb_typeof(actual)='object' THEN
      COALESCE(actual->>'id',actual->>'userId',actual->>'value')=expected
    ELSE FALSE END
$$;

CREATE OR REPLACE FUNCTION smart_manage_row_visible(
  row_values JSONB, row_id TEXT, row_created_by TEXT, board_columns JSONB,
  current_user_id TEXT, access_rule JSONB, member_team_id TEXT,
  member_department_id TEXT, member_company_id TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE
  access_scope TEXT := COALESCE(access_rule->>'scope','all_permitted');
  access_field TEXT;
  expected TEXT;
  actual JSONB;
  column_id TEXT;
BEGIN
  IF access_scope='all_permitted' THEN RETURN TRUE; END IF;
  IF access_scope='created_by_me' THEN RETURN row_created_by=current_user_id; END IF;
  IF access_scope='selected_records' THEN
    RETURN COALESCE(access_rule->'ids','[]'::jsonb) @> jsonb_build_array(to_jsonb(row_id));
  END IF;
  access_field := COALESCE(access_rule->>'field',access_rule#>>'{rule,field}',CASE access_scope
    WHEN 'assigned_to_me' THEN 'assignedUserId' WHEN 'my_team' THEN 'teamId'
    WHEN 'my_department' THEN 'departmentId' WHEN 'my_company' THEN 'companyId'
    WHEN 'selected_customers' THEN 'customerId' ELSE NULL END);
  expected := CASE access_scope WHEN 'assigned_to_me' THEN current_user_id
    WHEN 'my_team' THEN member_team_id WHEN 'my_department' THEN member_department_id
    WHEN 'my_company' THEN member_company_id ELSE access_rule#>>'{rule,value}' END;
  IF access_scope='custom' AND expected='$current_user' THEN expected:=current_user_id; END IF;
  actual := row_values->access_field;
  IF actual IS NULL THEN
    SELECT column_item->>'id' INTO column_id
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(board_columns)='array' THEN board_columns ELSE '[]'::jsonb END) column_item
    WHERE column_item->>'id'=access_field
       OR regexp_replace(lower(column_item->>'name'),'[^a-z0-9]','','g')=regexp_replace(lower(access_field),'[^a-z0-9]','','g')
    LIMIT 1;
    actual := row_values->column_id;
  END IF;
  IF access_scope='selected_customers' THEN
    RETURN EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(access_rule->'ids','[]'::jsonb)) selected WHERE smart_manage_json_value_matches(actual,selected));
  END IF;
  RETURN smart_manage_json_value_matches(actual,expected);
END $$;
