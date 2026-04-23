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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PersonOption = { id: string; first_name: string; last_name: string; email: string };

export type PairRow = {
  id: string;
  participant: PersonOption | null;
  manager: PersonOption | null;
  tandem_status: string;
};

export function SessionPairsSection({
  sessionId,
  pairs,
  participantsAvailable,
  managersAvailable,
}: {
  sessionId: string;
  pairs: PairRow[];
  participantsAvailable: PersonOption[];
  managersAvailable: PersonOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [participantId, setParticipantId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exclude participants that already have a pair
  const participantsTaken = new Set(pairs.map((p) => p.participant?.id));
  const participantsOptions = participantsAvailable.filter(
    (p) => !participantsTaken.has(p.id)
  );

  async function handleCreate() {
    if (!participantId || !managerId) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/sessions/${sessionId}/pairs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ participant_id: participantId, manager_id: managerId }),
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Erreur ${res.status}`);
      return;
    }
    setOpen(false);
    setParticipantId("");
    setManagerId("");
    router.refresh();
  }

  async function handleDelete(pairId: string) {
    await fetch(`/api/admin/sessions/${sessionId}/pairs/${pairId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Binômes N / N+1 ({pairs.length})
        </h2>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Créer un binôme
        </Button>
      </div>

      {pairs.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Aucun binôme. Ajoute d&apos;abord des participants et managers puis apparie-les.
        </p>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant (N)</TableHead>
                <TableHead>Manager (N+1)</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pairs.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.participant
                      ? `${p.participant.first_name} ${p.participant.last_name}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {p.manager
                      ? `${p.manager.first_name} ${p.manager.last_name}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.tandem_status}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      aria-label="Supprimer"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un binôme</DialogTitle>
            <DialogDescription>
              Associe un participant (N) à son manager (N+1). Un document Tandem vierge
              est créé automatiquement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Participant (N)</label>
              {participantsOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tous les participants de la session ont déjà un binôme. Ajoute d&apos;abord
                  des participants.
                </p>
              ) : (
                <Select value={participantId} onValueChange={setParticipantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un participant…" />
                  </SelectTrigger>
                  <SelectContent>
                    {participantsOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Manager (N+1)</label>
              {managersAvailable.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun manager dans cette session. Ajoute-en dans la section Membres.
                </p>
              ) : (
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un manager…" />
                  </SelectTrigger>
                  <SelectContent>
                    {managersAvailable.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.first_name} {m.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={!participantId || !managerId || pending}
              onClick={handleCreate}
            >
              {pending ? "Création…" : "Créer le binôme"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
