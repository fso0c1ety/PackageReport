-- Transactional runner: future execution requires a controlled write window.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
CREATE INDEX IF NOT EXISTS uploaded_files_workspace_id_idx ON public.uploaded_files(workspace_id);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
    JOIN pg_am am ON am.oid=c.relam
    JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attname='workspace_id'
    WHERE i.indexrelid='public.uploaded_files_workspace_id_idx'::regclass
      AND i.indrelid='public.uploaded_files'::regclass AND am.amname='btree'
      AND i.indisvalid AND i.indisready AND NOT i.indisunique
      AND i.indnkeyatts=1 AND i.indnatts=1 AND i.indkey[0]=a.attnum
      AND i.indpred IS NULL AND i.indexprs IS NULL
  ) THEN RAISE EXCEPTION 'Unexpected uploaded_files_workspace_id_idx definition'; END IF;
END $$;
