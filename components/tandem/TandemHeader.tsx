"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import type { TandemStatus } from "@/types/tandem";
import { editableHeaderDates } from "@/lib/tandem-workflow";

type DatesShape = {
  date_premiere_journee: string | null;
  date_premier_rdv: string | null;
  dates_rdv_inter: string[] | null;
  date_dernier_rdv: string | null;
};

export function TandemHeader({
  pairId,
  participantName,
  managerName,
  status,
  initial,
}: {
  pairId: string;
  participantName: string;
  managerName: string;
  status: TandemStatus;
  initial: DatesShape;
}) {
  const editable = editableHeaderDates(status);
  const [dates, setDates] = useState<DatesShape>(initial);
  const latestRef = useRef(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDates(initial);
    latestRef.current = initial;
  }, [initial]);

  const save = useCallback(
    async (payload: Partial<DatesShape>) => {
      setSaving(true);
      await fetch(`/api/tandems/${pairId}/document`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaving(false);
    },
    [pairId]
  );

  function scheduleSave(patch: Partial<DatesShape>) {
    latestRef.current = { ...latestRef.current, ...patch };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(patch), 800);
  }

  function addInterDate() {
    const current = dates.dates_rdv_inter ?? [];
    if (current.length >= 3) return;
    const next = [...current, ""];
    setDates({ ...dates, dates_rdv_inter: next });
  }

  function updateInterDate(index: number, value: string) {
    const current = dates.dates_rdv_inter ?? [];
    const next = current.map((d, i) => (i === index ? value : d));
    setDates({ ...dates, dates_rdv_inter: next });
    if (value) {
      scheduleSave({ dates_rdv_inter: next.filter(Boolean) });
    }
  }

  function removeInterDate(index: number) {
    const current = dates.dates_rdv_inter ?? [];
    const next = current.filter((_, i) => i !== index);
    setDates({ ...dates, dates_rdv_inter: next });
    scheduleSave({ dates_rdv_inter: next });
  }

  return (
    <section className="rounded-lg border bg-card p-6">
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Participant (N)
          </Label>
          <p className="mt-1 font-medium">{participantName}</p>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Manager (N+1)
          </Label>
          <p className="mt-1 font-medium">{managerName}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="date_premiere_journee">Date de la 1ère journée</Label>
          <Input
            id="date_premiere_journee"
            type="date"
            value={dates.date_premiere_journee ?? ""}
            disabled={!editable.premiereJournee}
            onChange={(e) => {
              const v = e.target.value || null;
              setDates({ ...dates, date_premiere_journee: v });
              scheduleSave({ date_premiere_journee: v });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date_premier_rdv">Date du 1er RDV Tandem</Label>
          <Input
            id="date_premier_rdv"
            type="date"
            value={dates.date_premier_rdv ?? ""}
            disabled={!editable.premierRdv}
            onChange={(e) => {
              const v = e.target.value || null;
              setDates({ ...dates, date_premier_rdv: v });
              scheduleSave({ date_premier_rdv: v });
            }}
          />
        </div>

        <div className="md:col-span-2">
          <Label>RDV intermédiaires (max 3)</Label>
          <div className="mt-1.5 space-y-2">
            {(dates.dates_rdv_inter ?? []).map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="date"
                  value={d}
                  disabled={!editable.rdvInter}
                  onChange={(e) => updateInterDate(i, e.target.value)}
                />
                {editable.rdvInter ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInterDate(i)}
                    aria-label="Supprimer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {editable.rdvInter && (dates.dates_rdv_inter ?? []).length < 3 ? (
              <Button variant="outline" size="sm" onClick={addInterDate}>
                <Plus className="h-4 w-4" />
                Ajouter une date
              </Button>
            ) : null}
            {!(editable.rdvInter || (dates.dates_rdv_inter ?? []).length) ? (
              <p className="text-xs text-muted-foreground">
                Les dates intermédiaires seront saisissables après validation du RDV initial.
              </p>
            ) : null}
          </div>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="date_dernier_rdv">Date du dernier RDV</Label>
          <Input
            id="date_dernier_rdv"
            type="date"
            value={dates.date_dernier_rdv ?? ""}
            disabled={!editable.dernierRdv}
            onChange={(e) => {
              const v = e.target.value || null;
              setDates({ ...dates, date_dernier_rdv: v });
              scheduleSave({ date_dernier_rdv: v });
            }}
          />
        </div>
      </div>

      <p className="mt-3 text-right text-[10px] text-muted-foreground">
        {saving ? "Enregistrement…" : ""}
      </p>
    </section>
  );
}
