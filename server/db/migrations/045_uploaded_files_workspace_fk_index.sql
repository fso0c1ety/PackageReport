-- Transactional runner: future execution requires a controlled write window.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
CREATE INDEX IF NOT EXISTS uploaded_files_workspace_id_idx ON public.uploaded_files(workspace_id);
