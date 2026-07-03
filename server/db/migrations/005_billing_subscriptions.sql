CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'basic', 'standard', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'expired', 'canceled')),
  seat_limit INTEGER NOT NULL DEFAULT 5 CHECK (seat_limit > 0),
  trial_ends_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  purge_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscriptions (id, user_id, plan, status, seat_limit, trial_ends_at)
SELECT gen_random_uuid(), id, 'trial', 'trialing', 5, NOW() + INTERVAL '7 days'
FROM users
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS billing_archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_purge_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_lifecycle
  ON subscriptions(status, trial_ends_at, purge_at);
CREATE INDEX IF NOT EXISTS idx_tables_billing_archive
  ON tables(billing_archived_at, billing_purge_at);

CREATE TABLE IF NOT EXISTS enterprise_inquiries (
  id UUID PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  requested_seats INTEGER NOT NULL CHECK (requested_seats > 20),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
