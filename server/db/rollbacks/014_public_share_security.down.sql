ALTER TABLE tables
  DROP COLUMN IF EXISTS public_share_downloads,
  DROP COLUMN IF EXISTS public_share_expires_at,
  DROP COLUMN IF EXISTS public_share_password_hash;

