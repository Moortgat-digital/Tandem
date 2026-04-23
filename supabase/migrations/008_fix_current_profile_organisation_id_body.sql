-- 008_fix_current_profile_organisation_id_body.sql
-- Correction d'un bug introduit par la migration 007 :
-- ALTER FUNCTION ... RENAME TO a bien renommé la fonction mais pas son corps,
-- qui référençait toujours `tenant_id` (colonne disparue dans la même migration).
-- Résultat : toute évaluation RLS appelant current_profile_organisation_id()
-- échouait avec "column tenant_id does not exist", faisant retourner null à
-- toutes les requêtes profiles/sessions → le middleware rejetait la session.

CREATE OR REPLACE FUNCTION public.current_profile_organisation_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organisation_id FROM profiles WHERE id = auth.uid();
$$;
