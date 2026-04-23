"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Animateur = { id: string; first_name: string; last_name: string; email: string };

export function SessionAnimateursSection({
  sessionId,
  attached,
  available,
}: {
  sessionId: string;
  attached: Animateur[];
  available: Animateur[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!selected) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/sessions/${sessionId}/animateurs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ animateur_id: selected }),
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Erreur ${res.status}`);
      return;
    }
    setOpen(false);
    setSelected("");
    router.refresh();
  }

  async function handleRemove(animateurId: string) {
    await fetch(`/api/admin/sessions/${sessionId}/animateurs/${animateurId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Animateurs ({attached.length})
        </h2>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Rattacher
        </Button>
      </div>

      {attached.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Aucun animateur rattaché.
        </p>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {attached.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  {a.first_name} {a.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{a.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(a.id)}
                aria-label="Retirer"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rattacher un animateur</DialogTitle>
            <DialogDescription>
              Choisis un animateur parmi les profils existants.
            </DialogDescription>
          </DialogHeader>

          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun animateur disponible. Crée-en un depuis <code>/admin/users/new</code>.
            </p>
          ) : (
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {available.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.first_name} {a.last_name} — {a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button disabled={!selected || pending} onClick={handleAdd}>
              {pending ? "Rattachement…" : "Rattacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
