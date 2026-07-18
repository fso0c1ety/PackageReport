ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS public_share_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS public_share_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_share_downloads BOOLEAN NOT NULL DEFAULT FALSE;

