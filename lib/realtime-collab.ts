import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CellKey, RealtimeCellEvent } from "@/types/tandem";

/**
 * Channel Supabase Realtime dédié à un binôme Tandem.
 * Utilisé pour :
 *  - verrouillage exclusif par cellule (focus/blur)
 *  - diffusion du contenu mis à jour après auto-save
 *  - indicateur de présence globale
 */
export function tandemChannelName(tandemPairId: string): string {
  return `tandem_pair:${tandemPairId}`;
}

export function cellKey({ priorityPos, stage }: CellKey): string {
  return `${priorityPos}:${stage}`;
}

export function parseCellKey(key: string): CellKey | null {
  const parts = key.split(":");
  if (parts.length !== 2) return null;
  const pos = Number(parts[0]);
  if (!Number.isInteger(pos) || pos < 1 || pos > 5) return null;
  const stage = parts[1];
  if (!stage) return null;
  if (
    stage !== "rdv_initial" &&
    stage !== "rdv_inter" &&
    stage !== "rdv_final" &&
    stage !== "plan_action"
  ) {
    return null;
  }
  return { priorityPos: pos, stage };
}

export function subscribeToTandemChannel(
  client: SupabaseClient<Database>,
  tandemPairId: string,
  handlers: {
    onEvent?: (event: RealtimeCellEvent) => void;
    onPresenceSync?: (state: Record<string, unknown>) => void;
  }
) {
  const channel = client.channel(tandemChannelName(tandemPairId), {
    config: { broadcast: { self: false }, presence: { key: "user" } },
  });

  channel.on("broadcast", { event: "cell" }, (payload) => {
    handlers.onEvent?.(payload.payload as RealtimeCellEvent);
  });

  if (handlers.onPresenceSync) {
    channel.on("presence", { event: "sync" }, () => {
      handlers.onPresenceSync?.(channel.presenceState());
    });
  }

  return channel;
}
