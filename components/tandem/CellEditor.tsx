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

type CellEditorProps = {
  pairId: string;
  priorityPos: number;
  stage: TandemStage;
  /** 0 pour tous les stages sauf rdv_inter (1, 2 ou 3). */
  interIndex: number;
  initialValue: string;
  initialAcquisitionPct: number | null;
  editable: boolean;
  /** Affiche la jauge "% d'acquisition" (rdv_initial / rdv_inter / rdv_final). */
  showAcquisition: boolean;
  placeholder?: string;
  onSaved?: () => void;
};

export function CellEditor(props: CellEditorProps) {
  if (!props.editable) {
    return (
      <CellDisplay
        value={props.initialValue}
        placeholder={props.placeholder}
        showAcquisition={props.showAcquisition}
        acquisitionPct={props.initialAcquisitionPct}
      />
    );
  }
  return <CellEditorActive {...props} />;
}

function CellDisplay({
  value,
  placeholder,
  showAcquisition,
  acquisitionPct,
}: {
  value: string;
  placeholder?: string;
  showAcquisition: boolean;
  acquisitionPct: number | null;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "min-h-[80px] whitespace-pre-wrap rounded-md border border-dashed bg-muted/30 p-2 text-sm",
          value ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {value || placeholder || "—"}
      </div>
      {showAcquisition ? (
        <AcquisitionGauge value={acquisitionPct} readOnly />
      ) : null}
    </div>
  );
}

function CellEditorActive({
  pairId,
  priorityPos,
  stage,
  interIndex,
  initialValue,
  initialAcquisitionPct,
  showAcquisition,
  placeholder,
  onSaved,
}: CellEditorProps) {
  const router = useRouter();
  const realtime = useTandemRealtime();
  const target = useMemo<RealtimeTarget>(
    () => ({ kind: "cell", priorityPos, stage, interIndex }),
    [priorityPos, stage, interIndex]
  );
  const lock = useTargetLock(target);

  const [value, setValue] = useState(initialValue);
  const [acquisitionPct, setAcquisitionPct] = useState<number | null>(
    initialAcquisitionPct
  );
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

  useEffect(() => {
    setAcquisitionPct(initialAcquisitionPct);
  }, [initialAcquisitionPct]);

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
    async (content: string, pct: number | null) => {
      setStatus("saving");
      const res = await fetch(`/api/tandems/${pairId}/entries`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          priority_pos: priorityPos,
          stage,
          content,
          acquisition_pct: pct,
          ...(stage === "rdv_inter" ? { inter_index: interIndex } : {}),
        }),
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
    [pairId, priorityPos, stage, interIndex, onSaved, router, realtime, target]
  );

  function scheduleSave(nextValue: string) {
    latestRef.current = nextValue;
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save(latestRef.current, acquisitionPct);
    }, 1000);
  }

  function flushSave() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (latestRef.current !== initialRef.current) {
      void save(latestRef.current, acquisitionPct);
    }
  }

  function handleAcquisitionChange(next: number | null) {
    setAcquisitionPct(next);
    // On flush la saisie en cours puis on sauve avec la nouvelle valeur.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void save(latestRef.current, next);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isLockedByOther = Boolean(lock);

  return (
    <div className="space-y-1.5">
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
      {showAcquisition ? (
        <AcquisitionGauge
          value={acquisitionPct}
          onChange={handleAcquisitionChange}
          disabled={isLockedByOther}
        />
      ) : null}
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

function AcquisitionGauge({
  value,
  onChange,
  readOnly = false,
  disabled = false,
}: {
  value: number | null;
  onChange?: (next: number | null) => void;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        %&nbsp;Acq.
      </span>
      <div className="flex gap-0.5">
        {steps.map((n) => {
          const filled = value !== null && n <= value;
          return (
            <button
              key={n}
              type="button"
              disabled={readOnly || disabled}
              onClick={() => onChange?.(n === value ? null : n)}
              className={cn(
                "h-4 w-4 rounded-sm text-[9px] font-semibold transition",
                filled
                  ? "bg-coral text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted-foreground/20",
                (readOnly || disabled) && "cursor-default opacity-90"
              )}
              aria-label={`${n} sur 10`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <span
        className={cn(
          "text-[10px] font-semibold",
          value !== null ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {value !== null ? `${value}/10` : "—"}
      </span>
    </div>
  );
}
