\set ON_ERROR_STOP on
BEGIN;
SET LOCAL TIME ZONE 'UTC';
DO $$
BEGIN
  IF make_timestamptz(2026,3,29,0,0,0,'Europe/Belgrade') <> '2026-03-28 23:00Z'::timestamptz THEN RAISE EXCEPTION 'spring midnight'; END IF;
  IF make_timestamptz(2026,3,30,0,0,0,'Europe/Belgrade') <> '2026-03-29 22:00Z'::timestamptz THEN RAISE EXCEPTION 'spring offset'; END IF;
  IF make_timestamptz(2026,10,25,0,0,0,'Europe/Belgrade') <> '2026-10-24 22:00Z'::timestamptz THEN RAISE EXCEPTION 'fall midnight'; END IF;
  IF make_timestamptz(2026,10,26,0,0,0,'Europe/Belgrade') <> '2026-10-25 23:00Z'::timestamptz THEN RAISE EXCEPTION 'fall offset'; END IF;
  IF make_timestamptz(2026,10,29,0,0,0,'America/New_York') <> '2026-10-29 04:00Z'::timestamptz THEN RAISE EXCEPTION 'workspace zone'; END IF;
END $$;
CREATE TEMP TABLE deliveries (event_key text PRIMARY KEY);
INSERT INTO deliveries VALUES ('same-date') ON CONFLICT DO NOTHING;
INSERT INTO deliveries VALUES ('same-date') ON CONFLICT DO NOTHING;
DO $$ BEGIN IF (SELECT count(*) FROM deliveries) <> 1 THEN RAISE EXCEPTION 'duplicate delivery'; END IF; END $$;
ROLLBACK;
