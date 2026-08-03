ALTER TABLE uploaded_files
  ADD COLUMN IF NOT EXISTS checksum TEXT,
  ADD COLUMN IF NOT EXISTS virus_scan_status TEXT NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS uploaded_files_checksum_idx ON uploaded_files(checksum);
CREATE UNIQUE INDEX IF NOT EXISTS uploaded_files_active_object_idx
  ON uploaded_files(storage_provider, storage_bucket, object_path)
  WHERE object_path IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS file_audit_log (
  id TEXT PRIMARY KEY,
  file_id TEXT REFERENCES uploaded_files(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  workspace_id TEXT,
  ip_address TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS file_audit_log_file_idx ON file_audit_log(file_id, created_at DESC);
CREATE INDEX IF NOT EXISTS file_audit_log_workspace_idx ON file_audit_log(workspace_id, created_at DESC);
