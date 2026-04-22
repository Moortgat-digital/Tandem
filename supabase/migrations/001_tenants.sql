-- 001_tenants.sql
-- Espaces clients (marque blanche : slug, logo, couleur primaire)

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  logo_url      TEXT,
  primary_color TEXT DEFAULT '#1B3A6B',
  contact_email TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug) WHERE is_active = true;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
