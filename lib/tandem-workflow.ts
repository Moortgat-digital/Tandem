import type { TandemStatus, ValidatableStage } from "@/types/tandem";

/**
 * Statut → étape courante saisissable (ou null si terminé / pas démarré).
 * Les étapes passées sont en lecture seule, les futures masquées.
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
 *
 * allowMultipleInter : permet de re-valider plusieurs RDV intermédiaires
 * (revient de validated_inter à in_progress_rdv_inter le temps de l'itération
 * suivante, puis re-valide).
 */
export function nextStatusOnValidate(
  current: TandemStatus,
  stage: ValidatableStage,
  opts: { movingToFinal?: boolean } = {}
): TandemStatus | null {
  if (stage === "rdv_initial") {
    if (current === "not_started" || current === "in_progress_rdv_initial") {
      return "validated_1";
    }
    return null;
  }
  if (stage === "rdv_inter") {
    if (current === "validated_1" || current === "in_progress_rdv_inter") {
      return opts.movingToFinal ? "in_progress_rdv_final" : "validated_inter";
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
 * Statut passant automatiquement en "in_progress" quand on ouvre une étape
 * validée pour y saisir les observations suivantes.
 */
export function openNextStage(current: TandemStatus): TandemStatus {
  if (current === "validated_1") return "in_progress_rdv_inter";
  if (current === "validated_inter") return "in_progress_rdv_final";
  if (current === "not_started") return "in_progress_rdv_initial";
  return current;
}
