"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useTandemRealtime,
  useTargetLock,
} from "./TandemRealtimeProvider";
import type { RealtimeTarget } from "@/types/tandem";

type Props = {
  pairId: string;
  initialParticipant: string;
  initialManager: string;
  canEditParticipant: boolean;
  canEditManager: boolean;
};

export function TandemAttentes({
  pairId,
  initialParticipant,
  initialManager,
  canEditParticipant,
  canEditManager,
}: Props) {
  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Attentes vis-à-vis du parcours
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        <AttenteField
          pairId={pairId}
          field="attentes_participant"
          label="Quelles sont les attentes du participant vis-à-vis du parcours de formation ?"
          editable={canEditParticipant}
          initialValue={initialParticipant}
        />
        <AttenteField
          pairId={pairId}
          field="attentes_manager"
          label="Quelles sont les attentes du manager du participant ?"
          editable={canEditManager}
          initialValue={initialManager}
        />
      </div>
    </section>
  );
}

function AttenteField({
  pairId,
  field,
  label,
  editable,
  initialValue,
}: {
  pairId: string;
  field: "attentes_participant" | "attentes_manager";
  label: string;
  editable: boolean;
  initialValue: string;
}) {
  if (!editable) {
    return (
      <AttenteDisplay label={label} value={initialValue} />
    );
  }
  return (
    <AttenteEditor
      pairId={pairId}
      field={field}
      label={label}
      initialValue={initialValue}
    />
  );
}

function AttenteDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div
        className={cn(
          "min-h-[100px] whitespace-pre-wrap rounded-md border border-dashed bg-muted/30 p-2 text-sm",
          value ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

function AttenteEditor({
  pairId,
  field,
  label,
  initialValue,
}: {
  pairId: string;
  field: "attentes_participant" | "attentes_manager";
  label: string;
  initialValue: string;
}) {
  const router = useRouter();
  const realtime = useTandemRealtime();
  const target = useMemo<RealtimeTarget>(
    () =>
      field === "attentes_participant"
        ? { kind: "attentes_participant" }
        : { kind: "attentes_manager" },
    [field]
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
    async (content: string) => {
      setStatus("saving");
      const res = await fetch(`/api/tandems/${pairId}/document`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: content }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("saved");
      initialRef.current = content;
      realtime.broadcastContent(target, content);
      if (firstSaveRef.current) {
        firstSaveRef.current = false;
        router.refresh();
      }
    },
    [pairId, field, router, realtime, target]
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
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
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
        className={cn(
          "min-h-[100px] resize-y",
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
