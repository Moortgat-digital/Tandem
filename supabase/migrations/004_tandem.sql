-- 004_tandem.sql
-- Le cœur métier : binômes N/N+1, documents, priorités, cellules, validations

CREATE TABLE tandem_pairs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tandem_status  TEXT NOT NULL DEFAULT 'not_started' CHECK (tandem_status IN (
    'not_started',
    'in_progress_rdv_initial',
    'validated_1',
    'in_progress_rdv_inter',
    'validated_inter',
    'in_progress_rdv_final',
    'completed'
  )),
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, participant_id),
  CHECK (participant_id <> manager_id)
);

CREATE INDEX idx_tandem_pairs_participant ON tandem_pairs(participant_id);
CREATE INDEX idx_tandem_pairs_manager ON tandem_pairs(manager_id);
CREATE INDEX idx_tandem_pairs_session ON tandem_pairs(session_id);

CREATE TABLE tandem_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tandem_pair_id        UUID UNIQUE NOT NULL REFERENCES tandem_pairs(id) ON DELETE CASCADE,
  date_premiere_journee DATE,
  date_premier_rdv      DATE,
  dates_rdv_inter       DATE[] DEFAULT ARRAY[]::DATE[],
  date_dernier_rdv      DATE,
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tandem_priorities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES tandem_documents(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL CHECK (position BETWEEN 1 AND 5),
  title       TEXT NOT NULL,
  UNIQUE(document_id, position)
);

CREATE TABLE tandem_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES tandem_documents(id) ON DELETE CASCADE,
  priority_pos INTEGER NOT NULL CHECK (priority_pos BETWEEN 1 AND 5),
  stage        TEXT NOT NULL CHECK (stage IN ('rdv_initial','rdv_inter','rdv_final','plan_action')),
  content      TEXT,
  is_locked    BOOLEAN DEFAULT false,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  updated_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(document_id, priority_pos, stage)
);

CREATE INDEX idx_tandem_entries_document ON tandem_entries(document_id);

CREATE TABLE tandem_validations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tandem_pair_id UUID NOT NULL REFERENCES tandem_pairs(id) ON DELETE CASCADE,
  stage          TEXT NOT NULL CHECK (stage IN ('rdv_initial','rdv_inter','rdv_final')),
  validated_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  validated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tandem_validations_pair ON tandem_validations(tandem_pair_id);

ALTER TABLE tandem_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tandem_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tandem_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tandem_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tandem_validations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_in_pair(p_pair_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tandem_pairs
    WHERE id = p_pair_id
      AND (participant_id = auth.uid() OR manager_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_in_document(p_document_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tandem_documents d
    JOIN tandem_pairs p ON p.id = d.tandem_pair_id
    WHERE d.id = p_document_id
      AND (p.participant_id = auth.uid() OR p.manager_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_animateur_of_pair(p_pair_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tandem_pairs tp
    JOIN session_animateurs sa ON sa.session_id = tp.session_id
    WHERE tp.id = p_pair_id AND sa.animateur_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_animateur_of_document(p_document_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tandem_documents d
    JOIN tandem_pairs tp ON tp.id = d.tandem_pair_id
    JOIN session_animateurs sa ON sa.session_id = tp.session_id
    WHERE d.id = p_document_id AND sa.animateur_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_in_pair(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_in_document(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_animateur_of_pair(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_animateur_of_document(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_in_pair(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_in_document(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_animateur_of_pair(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_animateur_of_document(UUID) TO authenticated;
