-- Phase 3C: additive template portal assignment metadata.
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS primary_job_role TEXT;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS permitted_portals JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE workspace_members
SET primary_job_role = COALESCE(primary_job_role, job_roles->>0),
    permitted_portals = CASE
      WHEN jsonb_array_length(COALESCE(permitted_portals,'[]'::jsonb)) > 0 THEN permitted_portals
      ELSE jsonb_build_array(COALESCE(portal_type,'standard'))
    END;

CREATE INDEX IF NOT EXISTS idx_workspace_members_primary_job_role
  ON workspace_members(workspace_id, primary_job_role);
