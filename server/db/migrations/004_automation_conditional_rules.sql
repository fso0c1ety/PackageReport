-- Make automation persistence compatible with both legacy and current installs.
ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS trigger JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trigger_col TEXT,
  ADD COLUMN IF NOT EXISTS cols JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recipients JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS task_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'email';

