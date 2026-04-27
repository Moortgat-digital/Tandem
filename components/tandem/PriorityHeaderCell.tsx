"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useTandemRealtime,
  useTargetLock,
} from "./TandemRealtimeProvider";
import type { RealtimeTarget } from "@/types/tandem";

type Props = {
  pairId: string;
  position: number;
  initialTitle: string;
  editable: boolean;
};

export function PriorityHeaderCell(props: Props) {
  if (!props.editable) {
    return (
      <PriorityHeaderDisplay
        position={props.position}
        title={props.initialTitle}
      />
    );
  }
  return <PriorityHeaderEditor {...props} />;
}

function PriorityHeaderDisplay({
  position,
  title,
}: {
  position: number;
  title: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-2 text-sm font-medium",
        title ? "bg-primary/5 text-foreground" : "bg-muted/40 text-muted-foreground"
      )}
    >
      {title || `Priorité ${position} — non définie`}
    </div>
  );
}

function PriorityHeaderEditor({
  pairId,
  position,
  initialTitle,
}: Props) {
  const router = useRouter();
  const realtime = useTandemRealtime();
  const target = useMemo<RealtimeTarget>(
    () => ({ kind: "priority_title", position }),
    [position]
  );
  const lock = useTargetLock(target);

  const [value, setValue] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(initialTitle);
  const initialRef = useRef(initialTitle);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    setValue(initialTitle);
    latestRef.current = initialTitle;
    initialRef.current = initialTitle;
  }, [initialTitle]);

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
      if (inputRef.current) inputRef.current.blur();
    });
  }, [realtime, target]);

  const save = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setSaving(true);
      const res = await fetch(`/api/tandems/${pairId}/priorities`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ position, title: trimmed }),
      });
      setSaving(false);
      if (!res.ok) return;
      initialRef.current = trimmed;
      realtime.broadcastContent(target, trimmed);
      router.refresh();
    },
    [pairId, position, router, realtime, target]
  );

  function scheduleSave(next: string) {
    latestRef.current = next;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(latestRef.current), 800);
  }

  function flushSave() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (latestRef.current.trim() && latestRef.current !== initialRef.current) {
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
      <Input
        ref={inputRef}
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
        placeholder={`Priorité ${position}`}
        className={cn(
          "font-medium",
          isLockedByOther && "cursor-not-allowed border-amber-400 bg-amber-50/40"
        )}
      />
      <p className="text-[10px] text-muted-foreground">
        {isLockedByOther
          ? <span className="text-amber-700">{lock?.firstName} modifie ce titre…</span>
          : saving
            ? "Enregistrement…"
            : value.trim()
              ? ""
              : "Nomme la priorité pour activer la colonne"}
      </p>
    </div>
  );
}
