"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { TandemStage } from "@/types/tandem";

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
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(initialValue);
  const initialRef = useRef(initialValue);
  const firstSaveRef = useRef(true);

  // Si le parent change la valeur initiale (refresh), on resynchronise.
  useEffect(() => {
    setValue(initialValue);
    latestRef.current = initialValue;
    initialRef.current = initialValue;
  }, [initialValue]);

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
      onSaved?.();
      // Au premier save (ouverture d'une nouvelle étape), le statut du binôme
      // peut avoir changé côté serveur — on rafraîchit pour mettre à jour le badge.
      if (firstSaveRef.current) {
        firstSaveRef.current = false;
        router.refresh();
      }
    },
    [pairId, priorityPos, stage, onSaved, router]
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

  return (
    <div className="space-y-1">
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          scheduleSave(e.target.value);
        }}
        onBlur={flushSave}
        placeholder={placeholder}
        className="min-h-[90px] resize-y"
      />
      <div className="text-right text-[10px] text-muted-foreground">
        {status === "saving"
          ? "Enregistrement…"
          : status === "saved"
            ? "Enregistré"
            : status === "dirty"
              ? "Modifications en attente"
              : status === "error"
                ? "Erreur d'enregistrement"
                : ""}
      </div>
    </div>
  );
}
