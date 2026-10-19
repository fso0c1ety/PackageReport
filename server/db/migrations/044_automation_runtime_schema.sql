-- Additive prerequisite for automation routes; preserves SERIAL and TEXT IDs.
CREATE TABLE IF NOT EXISTS automations (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE automations
      ADD COLUMN IF NOT EXISTS task_id TEXT,
      ADD COLUMN IF NOT EXISTS task_ids JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS trigger_col TEXT,
      ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS recipients JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS cols JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'email',
      ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'column_change',
      ADD COLUMN IF NOT EXISTS action_config JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS created_by TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
      ,ADD COLUMN IF NOT EXISTS name TEXT
      ,ADD COLUMN IF NOT EXISTS definition JSONB DEFAULT '{}'::jsonb
      ,ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1
      ,ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ
      ,ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT 0
      ,ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS automation_runs (
      id TEXT PRIMARY KEY, automation_id TEXT NOT NULL, table_id TEXT, row_id TEXT,
      idempotency_key TEXT, trigger_type TEXT, input JSONB DEFAULT '{}'::jsonb,
      actions JSONB DEFAULT '[]'::jsonb, output JSONB DEFAULT '{}'::jsonb,
      status TEXT DEFAULT 'pending', error_message TEXT, attempt INTEGER DEFAULT 1,
      max_attempts INTEGER DEFAULT 3, scheduled_for TIMESTAMPTZ, started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
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
      ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS automation_runs_idempotency_key_idx ON automation_runs(idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE automation_runs ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

