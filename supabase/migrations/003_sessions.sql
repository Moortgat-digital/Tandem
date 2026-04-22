-- 003_sessions.sql
-- Sessions de formation, animateurs rattachés, groupes, membres

CREATE TABLE sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  nb_priorites_max         INTEGER DEFAULT 5 CHECK (nb_priorites_max BETWEEN 1 AND 5),
  allow_multiple_rdv_inter BOOLEAN DEFAULT true,
  status                   TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX idx_sessions_status ON sessions(status);

CREATE TABLE session_animateurs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  animateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, animateur_id)
);

CREATE INDEX idx_session_animateurs_animateur ON session_animateurs(animateur_id);

CREATE TABLE formation_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, name)
);

CREATE TABLE session_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_session TEXT NOT NULL CHECK (role_in_session IN ('participant','manager')),
  group_id        UUID REFERENCES formation_groups(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id, role_in_session)
);

CREATE INDEX idx_session_members_session ON session_members(session_id);
CREATE INDEX idx_session_members_user ON session_members(user_id);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_animateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_animateur_of_session(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM session_animateurs
    WHERE session_id = p_session_id AND animateur_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_session(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM session_members
    WHERE session_id = p_session_id AND user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_animateur_of_session(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_member_of_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_animateur_of_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_session(UUID) TO authenticated;
