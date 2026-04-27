"use client";

import { useTandemRealtime } from "./TandemRealtimeProvider";

export function PresenceBadge() {
  const { presence } = useTandemRealtime();
  if (presence.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        Seul·e en ligne
      </span>
    );
  }
  const names = presence.map((p) => p.firstName).join(", ");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
      {names} {presence.length === 1 ? "est" : "sont"} en ligne
    </span>
  );
}
