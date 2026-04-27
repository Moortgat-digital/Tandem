import type { Tables } from "./database";

export type UserRole = "admin" | "animateur" | "participant" | "manager";

export type TandemStatus =
  | "not_started"
  | "in_progress_rdv_initial"
  | "validated_1"
  | "in_progress_rdv_inter"
  | "validated_inter"
  | "in_progress_rdv_final"
  | "completed";

export type TandemStage =
  | "rdv_initial"
  | "rdv_inter"
  | "rdv_final"
  | "plan_action";

export type ValidatableStage = Exclude<TandemStage, "plan_action">;

export type SessionStatus = "draft" | "active" | "archived";

export type AuditAction =
  | "edit_entry"
  | "delete_tandem"
  | "change_status"
  | "unlock_stage"
  | "edit_priority"
  | "edit_document";

export type Profile = Tables<"profiles">;
export type Organisation = Tables<"organisations">;
export type Session = Tables<"sessions">;
export type TandemPair = Tables<"tandem_pairs">;
export type TandemDocument = Tables<"tandem_documents">;
export type TandemPriority = Tables<"tandem_priorities">;
export type TandemEntry = Tables<"tandem_entries">;
export type TandemValidation = Tables<"tandem_validations">;

/**
 * Contexte utilisateur : couvre le double-rôle N / N+1.
 * Renvoyé par GET /api/me/contexts.
 */
export type UserContext =
  | { kind: "root"; role: "admin" | "animateur" }
  | {
      kind: "organisation";
      organisationId: string;
      organisationSlug: string;
      roles: ("participant" | "manager")[];
    };

/**
 * Événements Realtime du verrouillage par cellule.
 * Channel : `tandem_pair:${tandemPairId}`
 *
 * Une "cible" peut être une cellule de la grille (priorité × étape) ou
 * le titre d'une colonne de priorité.
 */
export type RealtimeTarget =
  | { kind: "cell"; priorityPos: number; stage: TandemStage }
  | { kind: "priority_title"; position: number };

export type RealtimeCellEvent =
  | {
      type: "focus";
      userId: string;
      userFirstName: string;
      target: RealtimeTarget;
    }
  | {
      type: "blur";
      userId: string;
      target: RealtimeTarget;
    }
  | {
      type: "content_update";
      userId: string;
      target: RealtimeTarget;
      content: string;
      updatedAt: string;
    };

export type RealtimePresenceMeta = {
  userId: string;
  firstName: string;
  role: "participant" | "manager";
};
