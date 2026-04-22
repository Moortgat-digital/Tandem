-- 005_rls_policies.sql
-- Policies RLS : lecture/écriture granulaires par rôle.
-- Le service_role bypasse RLS (utilisé côté serveur pour Admin).

-- ============================================================
-- tenants
-- ============================================================
-- Les utilisateurs rattachés voient leur propre tenant. Les rôles racine voient
-- tous les tenants. Les écritures sont réservées à l'admin (via service_role).

CREATE POLICY tenants_select_own ON tenants
  FOR SELECT TO authenticated
  USING (
    id = current_profile_tenant_id()
    OR is_admin()
    OR is_animateur()
  );

-- ============================================================
-- profiles
-- ============================================================
-- Un user voit :
--  - son propre profil
--  - les profils de son tenant (participants/managers entre eux)
--  - l'admin voit tout
--  - l'animateur voit les profils des membres de ses sessions

CREATE POLICY profiles_select_self ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_select_same_tenant ON profiles
  FOR SELECT TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND tenant_id = current_profile_tenant_id()
  );

CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY profiles_select_animateur ON profiles
  FOR SELECT TO authenticated
  USING (
    is_animateur()
    AND (
      tenant_id IS NULL
      OR EXISTS (
        SELECT 1 FROM session_members sm
        JOIN session_animateurs sa ON sa.session_id = sm.session_id
        WHERE sm.user_id = profiles.id
          AND sa.animateur_id = auth.uid()
      )
    )
  );

-- Pas de policies INSERT/UPDATE/DELETE : passées via service_role côté serveur.

-- ============================================================
-- sessions
-- ============================================================
CREATE POLICY sessions_select_admin ON sessions
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY sessions_select_animateur ON sessions
  FOR SELECT TO authenticated
  USING (is_animateur_of_session(id));

CREATE POLICY sessions_select_member ON sessions
  FOR SELECT TO authenticated
  USING (is_member_of_session(id));

-- ============================================================
-- session_animateurs
-- ============================================================
CREATE POLICY session_animateurs_select_admin ON session_animateurs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY session_animateurs_select_self ON session_animateurs
  FOR SELECT TO authenticated
  USING (animateur_id = auth.uid());

CREATE POLICY session_animateurs_select_member ON session_animateurs
  FOR SELECT TO authenticated
  USING (is_member_of_session(session_id));

-- ============================================================
-- formation_groups
-- ============================================================
CREATE POLICY formation_groups_select_admin ON formation_groups
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY formation_groups_select_animateur ON formation_groups
  FOR SELECT TO authenticated
  USING (is_animateur_of_session(session_id));

CREATE POLICY formation_groups_select_member ON formation_groups
  FOR SELECT TO authenticated
  USING (is_member_of_session(session_id));

-- ============================================================
-- session_members
-- ============================================================
CREATE POLICY session_members_select_admin ON session_members
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY session_members_select_self ON session_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY session_members_select_animateur ON session_members
  FOR SELECT TO authenticated
  USING (is_animateur_of_session(session_id));

CREATE POLICY session_members_select_same_session ON session_members
  FOR SELECT TO authenticated
  USING (is_member_of_session(session_id));

-- ============================================================
-- tandem_pairs
-- ============================================================
CREATE POLICY tandem_pairs_select_admin ON tandem_pairs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY tandem_pairs_select_animateur ON tandem_pairs
  FOR SELECT TO authenticated
  USING (is_animateur_of_session(session_id));

CREATE POLICY tandem_pairs_select_own ON tandem_pairs
  FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR manager_id = auth.uid());

-- UPDATE : seul l'admin peut forcer (via service_role). Le workflow côté app
-- passe par /api/tandems/* qui utilise service_role après vérifs d'autorisation.

-- ============================================================
-- tandem_documents
-- ============================================================
CREATE POLICY tandem_documents_select_admin ON tandem_documents
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY tandem_documents_select_animateur ON tandem_documents
  FOR SELECT TO authenticated
  USING (is_animateur_of_document(id));

CREATE POLICY tandem_documents_select_in_pair ON tandem_documents
  FOR SELECT TO authenticated
  USING (is_in_pair(tandem_pair_id));

CREATE POLICY tandem_documents_update_in_pair ON tandem_documents
  FOR UPDATE TO authenticated
  USING (is_in_pair(tandem_pair_id))
  WITH CHECK (is_in_pair(tandem_pair_id));

-- ============================================================
-- tandem_priorities
-- ============================================================
CREATE POLICY tandem_priorities_select_admin ON tandem_priorities
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY tandem_priorities_select_animateur ON tandem_priorities
  FOR SELECT TO authenticated
  USING (is_animateur_of_document(document_id));

CREATE POLICY tandem_priorities_select_in_doc ON tandem_priorities
  FOR SELECT TO authenticated
  USING (is_in_document(document_id));

CREATE POLICY tandem_priorities_insert_in_doc ON tandem_priorities
  FOR INSERT TO authenticated
  WITH CHECK (is_in_document(document_id));

CREATE POLICY tandem_priorities_update_in_doc ON tandem_priorities
  FOR UPDATE TO authenticated
  USING (is_in_document(document_id))
  WITH CHECK (is_in_document(document_id));

CREATE POLICY tandem_priorities_delete_in_doc ON tandem_priorities
  FOR DELETE TO authenticated
  USING (is_in_document(document_id));

-- ============================================================
-- tandem_entries
-- ============================================================
CREATE POLICY tandem_entries_select_admin ON tandem_entries
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY tandem_entries_select_animateur ON tandem_entries
  FOR SELECT TO authenticated
  USING (is_animateur_of_document(document_id));

CREATE POLICY tandem_entries_select_in_doc ON tandem_entries
  FOR SELECT TO authenticated
  USING (is_in_document(document_id));

CREATE POLICY tandem_entries_insert_in_doc ON tandem_entries
  FOR INSERT TO authenticated
  WITH CHECK (is_in_document(document_id));

CREATE POLICY tandem_entries_update_in_doc ON tandem_entries
  FOR UPDATE TO authenticated
  USING (is_in_document(document_id) AND is_locked = false)
  WITH CHECK (is_in_document(document_id));

-- ============================================================
-- tandem_validations
-- ============================================================
CREATE POLICY tandem_validations_select_admin ON tandem_validations
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY tandem_validations_select_animateur ON tandem_validations
  FOR SELECT TO authenticated
  USING (is_animateur_of_pair(tandem_pair_id));

CREATE POLICY tandem_validations_select_in_pair ON tandem_validations
  FOR SELECT TO authenticated
  USING (is_in_pair(tandem_pair_id));

CREATE POLICY tandem_validations_insert_in_pair ON tandem_validations
  FOR INSERT TO authenticated
  WITH CHECK (
    is_in_pair(tandem_pair_id)
    AND validated_by = auth.uid()
  );
