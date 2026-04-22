-- 002_profiles.sql
-- Profils utilisateurs (extension de auth.users)
-- tenant_id est NULL pour les rôles racine (admin, animateur)

CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('admin','animateur','participant','manager')),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  invitation_sent BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT root_roles_have_no_tenant CHECK (
    (role IN ('admin','animateur') AND tenant_id IS NULL)
    OR
    (role IN ('participant','manager') AND tenant_id IS NOT NULL)
  )
);

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(lower(email));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper functions (SECURITY DEFINER) pour éviter la récursion RLS sur profiles.
-- Elles lisent profiles en tant que définisseur, donc pas besoin d'une policy
-- "select sur sa ligne" pour que les autres policies fonctionnent.

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_profile_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_animateur()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'animateur');
$$;

REVOKE EXECUTE ON FUNCTION public.current_profile_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_profile_tenant_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_animateur() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_animateur() TO authenticated;
