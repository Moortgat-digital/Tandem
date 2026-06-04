import type { TandemStage, TandemStatus, ValidatableStage } from "@/types/tandem";

/**
 * Liste des étapes saisissables (cellules éditables) pour un statut donné.
 * - RDV initial : rdv_initial
 * - RDV intermédiaire : rdv_inter (par occurrence — voir la grille pour le
 *   verrouillage par inter_index)
 * - RDV final : rdv_final ET plan_action (remplis ensemble au dernier RDV)
 *
 * Les statuts "validated_X" autorisent la saisie de l'étape suivante : la
 * première frappe basculera automatiquement le statut en "in_progress_Y"
 * via openNextStage(). C'est ce qui permet à un binôme de démarrer le
 * prochain RDV sans bouton supplémentaire "Ouvrir l'étape suivante".
 *
 * Cas particulier `validated_inter` : on autorise À LA FOIS rdv_inter (pour
 * démarrer le prochain inter, jusqu'à 3) ET rdv_final/plan_action (pour
 * passer directement au final). Le binôme choisit en saisissant.
 */
export function editableStages(status: TandemStatus): TandemStage[] {
  switch (status) {
    case "not_started":
    case "in_progress_rdv_initial":
      return ["rdv_initial"];
    case "validated_1":
    case "in_progress_rdv_inter":
      return ["rdv_inter"];
    case "validated_inter":
      // En `validated_inter`, le binôme peut soit démarrer le prochain RDV
      // intermédiaire (jusqu'à 3 occurrences), soit attaquer le RDV final
      // (rdv_final + plan_action ouverts ensemble). Le Plan d'action reste
      // bien solidaire du RDV final — on les expose toujours en paire.
      return ["rdv_inter", "rdv_final", "plan_action"];
    case "in_progress_rdv_final":
      return ["rdv_final", "plan_action"];
    default:
      return [];
  }
}

/**
 * Étapes visibles (éditables + lecture seule). Le Plan d'action est toujours
 * affiché — quand il n'est pas encore éditable, la grille affiche un message
 * « Disponible au RDV final » à la place du contenu.
 */
export function visibleStages(status: TandemStatus): TandemStage[] {
  switch (status) {
    case "not_started":
    case "in_progress_rdv_initial":
      return ["rdv_initial", "plan_action"];
    case "validated_1":
    case "in_progress_rdv_inter":
      return ["rdv_initial", "rdv_inter", "plan_action"];
    case "validated_inter":
    case "in_progress_rdv_final":
    case "completed":
      return ["rdv_initial", "rdv_inter", "rdv_final", "plan_action"];
  }
}

/**
 * Statut → étape courante saisissable principale (ou null si terminé).
 * Utile pour afficher "Étape en cours : RDV intermédiaire" par ex.
 *
 * Les statuts `validated_X` ne renvoient PAS d'étape courante : tant que
 * personne n'a tapé un caractère dans la prochaine étape, il n'y a rien à
 * valider. La page peut afficher un message « Démarre la saisie pour ouvrir
 * la prochaine étape » à la place du bouton.
 */
export function currentEditableStage(status: TandemStatus): ValidatableStage | null {
  switch (status) {
    case "not_started":
    case "in_progress_rdv_initial":
      return "rdv_initial";
    case "in_progress_rdv_inter":
      return "rdv_inter";
    case "in_progress_rdv_final":
      return "rdv_final";
    default:
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
    // Les RDV intermédiaires sont répétables (jusqu'à 3) : on peut valider
    // un nouvel inter depuis l'état validated_inter aussi (occurrence > 1).
    if (
      current === "validated_1" ||
      current === "in_progress_rdv_inter" ||
      current === "validated_inter"
    ) {
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
 * Ouvre l'étape suivante quand un utilisateur commence à saisir.
 * Le résultat dépend de l'étape éditée :
 *  - Saisie dans rdv_inter alors que `validated_1` ou `validated_inter`
 *    → on bascule en `in_progress_rdv_inter` (démarrage d'un nouvel inter)
 *  - Saisie dans rdv_final / plan_action depuis `validated_inter`
 *    → on bascule en `in_progress_rdv_final`
 *  - Saisie dans rdv_initial depuis `not_started` → `in_progress_rdv_initial`
 */
export function openNextStage(
  current: TandemStatus,
  editedStage: TandemStage
): TandemStatus {
  if (editedStage === "rdv_initial") {
    return current === "not_started" ? "in_progress_rdv_initial" : current;
  }
  if (editedStage === "rdv_inter") {
    if (current === "validated_1" || current === "validated_inter") {
      return "in_progress_rdv_inter";
    }
    return current;
  }
  if (editedStage === "rdv_final" || editedStage === "plan_action") {
    if (current === "validated_inter") {
      return "in_progress_rdv_final";
    }
    return current;
  }
  return current;
}

/**
 * Quelles dates d'en-tête sont éditables au statut donné ?
 *
 * Les dates sont de l'information de planification : on les laisse toutes
 * éditables tant que le parcours n'est pas terminé, pour que le binôme
 * puisse caler son agenda dès le RDV initial et l'ajuster en cours de
 * route si une date doit bouger.
 */
export function editableHeaderDates(status: TandemStatus): {
  premiereJournee: boolean;
  premierRdv: boolean;
  rdvInter: boolean;
  dernierRdv: boolean;
} {
  const open = status !== "completed";
  return {
    premiereJournee: open,
    premierRdv: open,
    rdvInter: open,
    dernierRdv: open,
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
      return "RDV initial — État à l'instant t et % d'acquisition";
    case "rdv_inter":
      return "RDV intermédiaire — Observations";
    case "rdv_final":
      return "RDV final — Observations";
    case "plan_action":
      return "Plan d'action";
  }
}
