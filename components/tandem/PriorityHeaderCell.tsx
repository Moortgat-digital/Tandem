"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PriorityHeaderCell({
  pairId,
  position,
  initialTitle,
  editable,
}: {
  pairId: string;
  position: number;
  initialTitle: string;
  editable: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(initialTitle);

  useEffect(() => {
    setValue(initialTitle);
    latestRef.current = initialTitle;
  }, [initialTitle]);

  const save = useCallback(
    async (title: string) => {
      if (!title.trim()) return;
      setSaving(true);
      await fetch(`/api/tandems/${pairId}/priorities`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ position, title: title.trim() }),
      });
      setSaving(false);
      // Notifie le serveur : le grid doit recalculer quelles colonnes sont actives.
      router.refresh();
    },
    [pairId, position, router]
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
    if (latestRef.current.trim() && latestRef.current !== initialTitle) {
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
          "rounded-md border p-2 text-sm font-medium",
          value ? "bg-primary/5 text-foreground" : "bg-muted/40 text-muted-foreground"
        )}
      >
        {value || `Priorité ${position} — non définie`}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          scheduleSave(e.target.value);
        }}
        onBlur={flushSave}
        placeholder={`Priorité ${position}`}
        className="font-medium"
      />
      <p className="text-[10px] text-muted-foreground">
        {saving ? "Enregistrement…" : value.trim() ? "" : "Nomme la priorité pour activer la colonne"}
      </p>
    </div>
  );
}
