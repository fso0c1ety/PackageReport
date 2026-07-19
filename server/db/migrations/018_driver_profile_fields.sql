ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS driver_license TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_expiry DATE,
  ADD COLUMN IF NOT EXISTS passport JSONB;
