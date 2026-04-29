-- Migration 010: champs "Attentes" (N et N+1) sur le document + champ "KPI" par priorité.
--
-- - tandem_documents.attentes_participant : rempli par le participant pendant le RDV initial
-- - tandem_documents.attentes_manager     : rempli par le manager   pendant le RDV initial
-- - tandem_priorities.kpi                 : rempli librement par N et N+1, pas de verrou de stage

ALTER TABLE tandem_documents
  ADD COLUMN attentes_participant TEXT,
  ADD COLUMN attentes_manager     TEXT;

ALTER TABLE tandem_priorities
  ADD COLUMN kpi TEXT;
