import type { TandemStage, TandemStatus, ValidatableStage } from "@/types/tandem";

/**
 * Liste des étapes saisissables (cellules éditables) pour un statut donné.
 * - RDV initial : rdv_initial
 * - RDV intermédiaire : rdv_inter
 * - RDV final : rdv_final ET plan_action (remplis ensemble au dernier RDV)
 */
export function editableStages(status: TandemStatus): TandemStage[] {
  switch (status) {
    case "not_started":
    case "in_progress_rdv_initial":
      return ["rdv_initial"];
    case "in_progress_rdv_inter":
      return ["rdv_inter"];
    case "in_progress_rdv_final":
      return ["rdv_final", "plan_action"];
    default:
      return [];
  }
}

/**
 * Étapes visibles (éditables + lecture seule). Les étapes futures sont masquées.
 */
export function visibleStages(status: TandemStatus): TandemStage[] {
  switch (status) {
    case "not_started":
    case "in_progress_rdv_initial":
      return ["rdv_initial"];
    case "validated_1":
      return ["rdv_initial"];
    case "in_progress_rdv_inter":
    case "validated_inter":
      return ["rdv_initial", "rdv_inter"];
    case "in_progress_rdv_final":
    case "completed":
      return ["rdv_initial", "rdv_inter", "rdv_final", "plan_action"];
  }
}

/**
 * Statut → étape courante saisissable principale (ou null si terminé).
 * Utile pour afficher "Étape en cours : RDV intermédiaire" par ex.
 */
export function currentEditableStage(status: TandemStatus): ValidatableStage | null {
  switch (status) {
    case "not_started":
    case "in_progress_rdv_initial":
      return "rdv_initial";
    case "validated_1":
    case "in_progress_rdv_inter":
    case "validated_inter":
      return "rdv_inter";
    case "in_progress_rdv_final":
      return "rdv_final";
    case "completed":
      return null;
  }
}

/**
 * Transition d'état quand N ou N+1 clique "Valider ce compte rendu".
 * Renvoie le nouveau statut, ou null si la transition est invalide.
 */
export function nextStatusOnValidate(
  current: TandemStatus,
  stage: ValidatableStage
): TandemStatus | null {
  if (stage === "rdv_initial") {
    if (current === "not_started" || current === "in_progress_rdv_initial") {
      return "validated_1";
    }
    return null;
  }
  if (stage === "rdv_inter") {
    if (current === "validated_1" || current === "in_progress_rdv_inter") {
      return "validated_inter";
    }
    return null;
  }
  if (stage === "rdv_final") {
    if (current === "validated_inter" || current === "in_progress_rdv_final") {
      return "completed";
    }
    return null;
  }
  return null;
}

/**
 * Ouvre l'étape suivante (passe de "validated_X" à "in_progress_Y") quand le
 * premier des deux utilisateurs commence à saisir la suite.
 * Appelé implicitement à la première édition après une validation.
 */
export function openNextStage(current: TandemStatus): TandemStatus {
  switch (current) {
    case "not_started":
      return "in_progress_rdv_initial";
    case "validated_1":
      return "in_progress_rdv_inter";
    case "validated_inter":
      return "in_progress_rdv_final";
    default:
      return current;
  }
}

/**
 * Quelles dates d'en-tête sont éditables au statut donné ?
 */
export function editableHeaderDates(status: TandemStatus): {
  premiereJournee: boolean;
  premierRdv: boolean;
  rdvInter: boolean;
  dernierRdv: boolean;
} {
  const during = (s: TandemStatus[]) => s.includes(status);
  return {
    premiereJournee: during(["not_started", "in_progress_rdv_initial"]),
    premierRdv: during(["not_started", "in_progress_rdv_initial"]),
    rdvInter: during(["validated_1", "in_progress_rdv_inter", "validated_inter"]),
    dernierRdv: during(["validated_inter", "in_progress_rdv_final"]),
  };
}

/**
 * Label humain d'un statut Tandem.
 */
export function statusLabel(status: TandemStatus): string {
  switch (status) {
    case "not_started":
      return "Pas démarré";
    case "in_progress_rdv_initial":
      return "RDV initial en cours";
    case "validated_1":
      return "RDV initial validé";
    case "in_progress_rdv_inter":
      return "RDV intermédiaire en cours";
    case "validated_inter":
      return "RDV intermédiaire validé";
    case "in_progress_rdv_final":
      return "RDV final en cours";
    case "completed":
      return "Parcours terminé";
  }
}

/**
 * Label humain d'une étape (cellule / validation).
 */
export function stageLabel(stage: TandemStage): string {
  switch (stage) {
    case "rdv_initial":
      return "RDV initial — Description";
    case "rdv_inter":
      return "RDV intermédiaire — Observations";
    case "rdv_final":
      return "RDV final — Observations";
    case "plan_action":
      return "Plan d'action";
  }
}
