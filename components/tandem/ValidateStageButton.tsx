"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ValidatableStage } from "@/types/tandem";
import { stageLabel } from "@/lib/tandem-workflow";

export function ValidateStageButton({
  pairId,
  stage,
  disabled = false,
  hint,
}: {
  pairId: string;
  stage: ValidatableStage;
  disabled?: boolean;
  hint?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/tandems/${pairId}/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Erreur ${res.status}`);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={disabled}>
        Valider ce compte rendu
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider l&apos;étape</DialogTitle>
            <DialogDescription>
              Tu valides : <strong>{stageLabel(stage)}</strong>. Cette étape sera verrouillée
              en lecture seule. N et N+1 partagent cette validation — le premier arrivé
              l&apos;enclenche.
              {hint ? <span className="mt-2 block">{hint}</span> : null}
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={confirm} disabled={pending}>
              {pending ? "Validation…" : "Valider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
