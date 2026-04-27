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
  if (target.kind === "cell") {
    return `cell:${target.priorityPos}:${target.stage}`;
  }
  return `title:${target.position}`;
}

export function parseTargetKey(key: string): RealtimeTarget | null {
  const parts = key.split(":");
  if (parts[0] === "cell" && parts.length === 3) {
    const pos = Number(parts[1]);
    const stage = parts[2];
    if (!Number.isInteger(pos) || pos < 1 || pos > 5) return null;
    if (
      stage !== "rdv_initial" &&
      stage !== "rdv_inter" &&
      stage !== "rdv_final" &&
      stage !== "plan_action"
    ) {
      return null;
    }
    return { kind: "cell", priorityPos: pos, stage: stage as TandemStage };
  }
  if (parts[0] === "title" && parts.length === 2) {
    const pos = Number(parts[1]);
    if (!Number.isInteger(pos) || pos < 1 || pos > 5) return null;
    return { kind: "priority_title", position: pos };
  }
  return null;
}
