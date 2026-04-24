-- 009_anon_select_active_organisations.sql
-- Les pages de login par slug (/[slug]/login) chargent la marque blanche de
-- l'organisation AVANT que l'utilisateur soit authentifié. Les policies
-- existantes ciblaient `authenticated` uniquement → la requête renvoyait
-- null en anon et la page 404ait.
--
-- Aucune donnée sensible exposée : le slug est déjà dans l'URL publique,
-- display_name / logo_url / primary_color sont pensés pour s'afficher
-- publiquement sur la page de login.

CREATE POLICY organisations_select_anon_active ON organisations
  FOR SELECT
  TO anon
  USING (is_active = true);
