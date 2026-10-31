SET LOCAL lock_timeout = '3s';
CREATE INDEX IF NOT EXISTS idx_rows_table_id ON public.rows USING btree (table_id);
CREATE INDEX IF NOT EXISTS idx_rows_table_id_base ON public.rows USING btree (table_id);
CREATE INDEX IF NOT EXISTS idx_tables_workspace_id_base ON public.tables USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_row_id ON public.uploaded_files USING btree (row_id);
CREATE INDEX IF NOT EXISTS uploaded_files_table_id_idx ON public.uploaded_files USING btree (table_id);
