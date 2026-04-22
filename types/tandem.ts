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
 */
export type CellKey = { priorityPos: number; stage: TandemStage };

export type RealtimeCellEvent =
  | {
      type: "focus_cell";
      userId: string;
      userFirstName: string;
      cell: CellKey;
    }
  | {
      type: "blur_cell";
      userId: string;
      cell: CellKey;
    }
  | {
      type: "content_update";
      userId: string;
      cell: CellKey;
      content: string;
      updatedAt: string;
    };
