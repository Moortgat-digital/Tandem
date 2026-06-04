-- Migration 013 : la jauge "% d'acquisition" passe d'une note /10 à un
-- pourcentage discret de 0 à 100 par pas de 10 — UX plus naturelle (curseur).
--
-- Les valeurs existantes 1..10 sont multipliées par 10 pour préserver leur
-- ordre de grandeur (ex. 4/10 → 40 %).

UPDATE tandem_entries SET acquisition_pct = acquisition_pct * 10
WHERE acquisition_pct IS NOT NULL;

ALTER TABLE tandem_entries DROP CONSTRAINT tandem_entries_acquisition_pct_chk;

ALTER TABLE tandem_entries
  ADD CONSTRAINT tandem_entries_acquisition_pct_chk
  CHECK (
    acquisition_pct IS NULL
    OR (acquisition_pct BETWEEN 0 AND 100 AND acquisition_pct % 10 = 0)
  );
