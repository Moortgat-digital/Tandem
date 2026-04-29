"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useTandemRealtime,
  useTargetLock,
} from "./TandemRealtimeProvider";
import type { RealtimeTarget } from "@/types/tandem";

type Props = {
  pairId: string;
  position: number;
  initialKpi: string;
  editable: boolean;
};

export function PriorityKpiCell(props: Props) {
  if (!props.editable) {
    return <KpiDisplay value={props.initialKpi} />;
  }
  return <KpiEditor {...props} />;
}

function KpiDisplay({ value }: { value: string }) {
  return (
    <div
      className={cn(
        "min-h-[64px] whitespace-pre-wrap rounded-md border border-dashed bg-muted/30 p-2 text-xs",
        value ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {value || "—"}
    </div>
  );
}

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

function KpiEditor({ pairId, position, initialKpi }: Props) {
  const realtime = useTandemRealtime();
  const target = useMemo<RealtimeTarget>(
    () => ({ kind: "priority_kpi", position }),
    [position]
  );
  const lock = useTargetLock(target);

  const [value, setValue] = useState(initialKpi);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(initialKpi);
  const initialRef = useRef(initialKpi);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    setValue(initialKpi);
    latestRef.current = initialKpi;
    initialRef.current = initialKpi;
  }, [initialKpi]);

  useEffect(() => {
    return realtime.registerContentListener(target, (content) => {
      if (isFocusedRef.current) return;
      setValue(content);
      latestRef.current = content;
      initialRef.current = content;
    });
  }, [realtime, target]);

  useEffect(() => {
    return realtime.registerForceBlur(target, () => {
      if (textareaRef.current) textareaRef.current.blur();
    });
  }, [realtime, target]);

  const save = useCallback(
    async (kpi: string) => {
      setStatus("saving");
      const res = await fetch(`/api/tandems/${pairId}/priorities`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ position, kpi: kpi.trim() ? kpi : null }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("saved");
      initialRef.current = kpi;
      realtime.broadcastContent(target, kpi);
    },
    [pairId, position, realtime, target]
  );

  function scheduleSave(next: string) {
    latestRef.current = next;
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(latestRef.current), 1000);
  }

  function flushSave() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (latestRef.current !== initialRef.current) {
      void save(latestRef.current);
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isLockedByOther = Boolean(lock);

  return (
    <div className="space-y-1">
      <Textarea
        ref={textareaRef}
        value={value}
        readOnly={isLockedByOther}
        onFocus={() => {
          if (isLockedByOther) return;
          isFocusedRef.current = true;
          realtime.focus(target);
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          flushSave();
          realtime.blur(target);
        }}
        onChange={(e) => {
          if (isLockedByOther) return;
          setValue(e.target.value);
          scheduleSave(e.target.value);
        }}
        placeholder="Comment mesurer l'évolution sur cette priorité ?"
        className={cn(
          "min-h-[64px] resize-y text-xs",
          isLockedByOther && "cursor-not-allowed border-amber-400 bg-amber-50/40"
        )}
      />
      <div className="text-right text-[10px] text-muted-foreground">
        {isLockedByOther
          ? <span className="text-amber-700">{lock?.firstName} édite…</span>
          : status === "saving"
            ? "Enregistrement…"
            : status === "saved"
              ? "Enregistré"
              : status === "dirty"
                ? "En attente"
                : status === "error"
                  ? "Erreur"
                  : ""}
      </div>
    </div>
  );
}
