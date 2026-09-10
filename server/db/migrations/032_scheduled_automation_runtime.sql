CREATE TABLE IF NOT EXISTS scheduler_locks (
  name TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  locked_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL,
  table_id TEXT,
  row_id TEXT,
  idempotency_key TEXT,
  trigger_type TEXT,
  input JSONB DEFAULT '{}'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  output JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  attempt INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automation_runs
  ADD COLUMN IF NOT EXISTS table_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS trigger_type TEXT,
  ADD COLUMN IF NOT EXISTS input JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS output JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attempt INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS automation_runs_idempotency_key_idx
  ON automation_runs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS automations_scheduled_enabled_idx
  ON automations(enabled, table_id)
  WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS rows_table_id_scheduled_idx ON rows(table_id);

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_read_at TIMESTAMPTZ;
