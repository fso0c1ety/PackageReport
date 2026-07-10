ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT;

UPDATE public.users
SET first_name = NULLIF(SPLIT_PART(TRIM(name), ' ', 1), ''),
    last_name = CASE
      WHEN POSITION(' ' IN TRIM(name)) > 0
        THEN NULLIF(TRIM(SUBSTRING(TRIM(name) FROM POSITION(' ' IN TRIM(name)) + 1)), '')
      ELSE NULL
    END
WHERE first_name IS NULL
  AND NULLIF(TRIM(name), '') IS NOT NULL;
