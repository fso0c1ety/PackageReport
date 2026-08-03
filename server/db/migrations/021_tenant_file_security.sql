ALTER TABLE uploaded_files
  ADD COLUMN IF NOT EXISTS uploaded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS table_id TEXT REFERENCES tables(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS row_id TEXT REFERENCES rows(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'database',
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS object_path TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'tenant';

ALTER TABLE uploaded_files DROP CONSTRAINT IF EXISTS uploaded_files_visibility_check;
ALTER TABLE uploaded_files ADD CONSTRAINT uploaded_files_visibility_check CHECK (visibility IN ('tenant','profile'));

CREATE INDEX IF NOT EXISTS uploaded_files_uploaded_by_idx ON uploaded_files(uploaded_by);
CREATE INDEX IF NOT EXISTS uploaded_files_table_id_idx ON uploaded_files(table_id);
CREATE INDEX IF NOT EXISTS uploaded_files_row_id_idx ON uploaded_files(row_id);
