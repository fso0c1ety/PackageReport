CREATE TABLE IF NOT EXISTS auth_otp_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_user_created
  ON auth_otp_challenges(user_id, created_at DESC);

-- OTP challenges are backend-only. Protect both fresh and legacy tables.
ALTER TABLE public.auth_otp_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_otp_challenges FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.auth_otp_challenges FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.auth_otp_challenges FROM authenticated;
  END IF;
END $$;
