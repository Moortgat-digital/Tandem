-- Migration 012 : jauge "% d'acquisition" sur chaque cellule de RDV.
--
-- Chaque cellule (priorité × stage × inter_index) peut porter une note
-- entière de 1 à 10 indiquant le degré d'acquisition perçu par le binôme
-- au moment du RDV. La colonne reste NULL tant que rien n'est saisi —
-- notamment pour `plan_action` qui n'a pas vocation à porter une note.

ALTER TABLE tandem_entries
  ADD COLUMN acquisition_pct INTEGER;

ALTER TABLE tandem_entries
  ADD CONSTRAINT tandem_entries_acquisition_pct_chk
  CHECK (acquisition_pct IS NULL OR acquisition_pct BETWEEN 1 AND 10);
