-- Marketplace base tables are required by 013_template_marketplace.sql.
-- This forward migration is intentionally additive and safe for existing databases.
CREATE TABLE IF NOT EXISTS marketplace_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  template_key TEXT NOT NULL DEFAULT 'blank',
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  downloads INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
