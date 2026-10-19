-- Refuse drift, dependencies, constraint-backed or non-equivalent candidates.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
DO $$
DECLARE pair RECORD; old_oid OID; keep_oid OID; equivalent BOOLEAN;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('idx_rows_table_id','rows_table_id_scheduled_idx'),
    ('idx_rows_table_id_base','rows_table_id_scheduled_idx'),
    ('idx_tables_workspace_id_base','idx_tables_workspace_id'),
    ('idx_uploaded_files_row_id','uploaded_files_row_id_idx'),
    ('uploaded_files_table_id_idx','idx_uploaded_files_table_id')
  ) AS candidates(old_name,keep_name) LOOP
    old_oid := to_regclass(format('public.%I',pair.old_name));
    keep_oid := to_regclass(format('public.%I',pair.keep_name));
    IF old_oid IS NULL THEN CONTINUE; END IF;
    IF keep_oid IS NULL THEN RAISE EXCEPTION 'Missing retained index %',pair.keep_name; END IF;
    SELECT a.indrelid=b.indrelid AND a.indkey=b.indkey AND a.indclass=b.indclass
      AND a.indcollation=b.indcollation AND a.indoption=b.indoption
      AND a.indnkeyatts=b.indnkeyatts AND a.indnatts=b.indnatts
      AND a.indisvalid AND b.indisvalid AND a.indisready AND b.indisready
      AND NOT a.indisunique AND NOT b.indisunique AND NOT a.indisprimary AND NOT a.indisreplident
      AND a.indexprs IS NOT DISTINCT FROM b.indexprs AND a.indpred IS NOT DISTINCT FROM b.indpred
      AND ac.relam=bc.relam AND ac.relkind='i' AND bc.relkind='i'
      AND ac.reloptions IS NOT DISTINCT FROM bc.reloptions AND ac.reltablespace=bc.reltablespace
      INTO equivalent FROM pg_index a JOIN pg_index b ON b.indexrelid=keep_oid
      JOIN pg_class ac ON ac.oid=a.indexrelid JOIN pg_class bc ON bc.oid=b.indexrelid
      WHERE a.indexrelid=old_oid;
    IF equivalent IS DISTINCT FROM TRUE OR EXISTS(SELECT 1 FROM pg_constraint WHERE conindid=old_oid)
      OR EXISTS(SELECT 1 FROM pg_depend WHERE refobjid=old_oid) THEN
      RAISE EXCEPTION 'Unsafe or non-equivalent index %',pair.old_name;
    END IF;
    EXECUTE format('DROP INDEX public.%I RESTRICT',pair.old_name);
  END LOOP;
END $$;

