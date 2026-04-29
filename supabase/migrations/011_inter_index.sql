-- Migration 011 : RDV intermédiaires multiples (jusqu'à 3 par binôme).
--
-- Ajoute une colonne `inter_index` (1, 2 ou 3) sur tandem_entries et
-- tandem_validations pour distinguer les observations / validations de
-- chaque RDV intermédiaire programmé.
--
-- Convention : inter_index = 0 pour tous les stages autres que 'rdv_inter'.
-- Cela permet de réutiliser la même contrainte UNIQUE et le même CHECK
-- côté Postgres sans avoir à composer avec NULL.

-- ---------- tandem_entries ----------

ALTER TABLE tandem_entries
  ADD COLUMN inter_index INTEGER NOT NULL DEFAULT 0;

-- Les rdv_inter existants (modèle 1-ligne-unique) sont placés sur inter_index=1
-- AVANT d'ajouter le CHECK (sinon il refuse les rdv_inter à 0).
UPDATE tandem_entries SET inter_index = 1 WHERE stage = 'rdv_inter';

ALTER TABLE tandem_entries
  ADD CONSTRAINT tandem_entries_inter_index_chk
  CHECK (
    (stage = 'rdv_inter' AND inter_index BETWEEN 1 AND 3)
    OR (stage <> 'rdv_inter' AND inter_index = 0)
  );

ALTER TABLE tandem_entries DROP CONSTRAINT tandem_entries_document_id_priority_pos_stage_key;
ALTER TABLE tandem_entries
  ADD CONSTRAINT tandem_entries_unique_per_inter
  UNIQUE (document_id, priority_pos, stage, inter_index);

-- ---------- tandem_validations ----------

ALTER TABLE tandem_validations
  ADD COLUMN inter_index INTEGER NOT NULL DEFAULT 0;

UPDATE tandem_validations SET inter_index = 1 WHERE stage = 'rdv_inter';

ALTER TABLE tandem_validations
  ADD CONSTRAINT tandem_validations_inter_index_chk
  CHECK (
    (stage = 'rdv_inter' AND inter_index BETWEEN 1 AND 3)
    OR (stage <> 'rdv_inter' AND inter_index = 0)
  );
