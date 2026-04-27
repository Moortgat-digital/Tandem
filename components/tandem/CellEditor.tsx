"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useTandemRealtime,
  useTargetLock,
} from "./TandemRealtimeProvider";
import type { RealtimeTarget, TandemStage } from "@/types/tandem";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function CellEditor({
  pairId,
  priorityPos,
  stage,
  initialValue,
  editable,
  placeholder,
  onSaved,
}: {
  pairId: string;
  priorityPos: number;
  stage: TandemStage;
  initialValue: string;
  editable: boolean;
  placeholder?: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const realtime = useTandemRealtime();
  const target = useMemo<RealtimeTarget>(
    () => ({ kind: "cell", priorityPos, stage }),
    [priorityPos, stage]
  );
  const lock = useTargetLock(target);

  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(initialValue);
  const initialRef = useRef(initialValue);
  const firstSaveRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    setValue(initialValue);
    latestRef.current = initialValue;
    initialRef.current = initialValue;
  }, [initialValue]);

  // Reçoit les updates de contenu de l'autre côté (après leur save).
  // On ne patch pas si l'utilisateur est en train d'écrire ici.
  useEffect(() => {
    return realtime.registerContentListener(target, (content) => {
      if (isFocusedRef.current) return;
      setValue(content);
      latestRef.current = content;
      initialRef.current = content;
    });
  }, [realtime, target]);

  // Si l'autre côté prend la cellule alors qu'on tape (tie-break userId), on
  // cède : on flush la sauvegarde puis on blur l'input.
  useEffect(() => {
    return realtime.registerForceBlur(target, () => {
      if (textareaRef.current) textareaRef.current.blur();
    });
  }, [realtime, target]);

  const save = useCallback(
    async (content: string) => {
      setStatus("saving");
      const res = await fetch(`/api/tandems/${pairId}/entries`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priority_pos: priorityPos, stage, content }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("saved");
      initialRef.current = content;
      realtime.broadcastContent(target, content);
      onSaved?.();
      if (firstSaveRef.current) {
        firstSaveRef.current = false;
        router.refresh();
      }
    },
    [pairId, priorityPos, stage, onSaved, router, realtime, target]
  );

  function scheduleSave(nextValue: string) {
    latestRef.current = nextValue;
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save(latestRef.current);
    }, 1000);
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

  if (!editable) {
    return (
      <div
        className={cn(
          "min-h-[80px] whitespace-pre-wrap rounded-md border border-dashed bg-muted/30 p-2 text-sm",
          value ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {value || placeholder || "—"}
      </div>
    );
  }

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
        placeholder={placeholder}
        className={cn(
          "min-h-[90px] resize-y",
          isLockedByOther && "cursor-not-allowed border-amber-400 bg-amber-50/40"
        )}
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="text-amber-700">
          {isLockedByOther ? `${lock?.firstName} est en train d'écrire ici…` : ""}
        </span>
        <span>
          {status === "saving"
            ? "Enregistrement…"
            : status === "saved"
              ? "Enregistré"
              : status === "dirty"
                ? "Modifications en attente"
                : status === "error"
                  ? "Erreur d'enregistrement"
                  : ""}
        </span>
      </div>
    </div>
  );
}
