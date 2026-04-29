import type { RealtimeTarget, TandemStage } from "@/types/tandem";

/**
 * Channel Supabase Realtime dédié à un binôme Tandem.
 * Utilisé pour :
 *  - verrouillage transitoire par cellule / titre de priorité (focus / blur)
 *  - diffusion du contenu mis à jour après auto-save
 *  - indicateur de présence (qui est en ligne sur le doc)
 */
export function tandemChannelName(tandemPairId: string): string {
  return `tandem_pair:${tandemPairId}`;
}

export function targetKey(target: RealtimeTarget): string {
  switch (target.kind) {
    case "cell":
      return `cell:${target.priorityPos}:${target.stage}:${target.interIndex}`;
    case "priority_title":
      return `title:${target.position}`;
    case "priority_kpi":
      return `kpi:${target.position}`;
    case "attentes_participant":
      return "attentes_participant";
    case "attentes_manager":
      return "attentes_manager";
  }
}

export function parseTargetKey(key: string): RealtimeTarget | null {
  if (key === "attentes_participant") return { kind: "attentes_participant" };
  if (key === "attentes_manager") return { kind: "attentes_manager" };
  const parts = key.split(":");
  if (parts[0] === "cell" && parts.length === 4) {
    const pos = Number(parts[1]);
    const stage = parts[2];
    const interIndex = Number(parts[3]);
    if (!Number.isInteger(pos) || pos < 1 || pos > 5) return null;
    if (
      stage !== "rdv_initial" &&
      stage !== "rdv_inter" &&
      stage !== "rdv_final" &&
      stage !== "plan_action"
    ) {
      return null;
    }
    if (!Number.isInteger(interIndex) || interIndex < 0 || interIndex > 3) {
      return null;
    }
    return {
      kind: "cell",
      priorityPos: pos,
      stage: stage as TandemStage,
      interIndex,
    };
  }
  if (parts[0] === "title" && parts.length === 2) {
    const pos = Number(parts[1]);
    if (!Number.isInteger(pos) || pos < 1 || pos > 5) return null;
    return { kind: "priority_title", position: pos };
  }
  if (parts[0] === "kpi" && parts.length === 2) {
    const pos = Number(parts[1]);
    if (!Number.isInteger(pos) || pos < 1 || pos > 5) return null;
    return { kind: "priority_kpi", position: pos };
  }
  return null;
}
