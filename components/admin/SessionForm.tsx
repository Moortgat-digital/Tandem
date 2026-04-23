"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Session, SessionStatus } from "@/types/tandem";

type OrgOption = { id: string; display_name: string };

export function SessionForm({
  mode,
  session,
  organisations,
}: {
  mode: "create" | "edit";
  session?: Session;
  organisations: OrgOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState(session?.name ?? "");
  const [organisationId, setOrganisationId] = useState(session?.organisation_id ?? "");
  const [nbPriorites, setNbPriorites] = useState<number>(session?.nb_priorites_max ?? 5);
  const [allowMultipleInter, setAllowMultipleInter] = useState<boolean>(
    session?.allow_multiple_rdv_inter ?? true
  );
  const [status, setStatus] = useState<SessionStatus>(
    (session?.status as SessionStatus | null) ?? "draft"
  );
  const [ui, setUi] = useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUi({ kind: "saving" });

    const url =
      mode === "create" ? "/api/admin/sessions" : `/api/admin/sessions/${session!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const body =
      mode === "create"
        ? {
            name,
            organisation_id: organisationId,
            nb_priorites_max: nbPriorites,
            allow_multiple_rdv_inter: allowMultipleInter,
          }
        : {
            name,
            nb_priorites_max: nbPriorites,
            allow_multiple_rdv_inter: allowMultipleInter,
            status,
          };

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setUi({ kind: "error", message: data.error ?? `Erreur ${res.status}` });
      return;
    }

    if (mode === "create") {
      const data = (await res.json()) as { session: Session };
      router.push(`/admin/sessions/${data.session.id}`);
    } else {
      router.refresh();
      setUi({ kind: "idle" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nom de la session</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Exemple — Promo Octobre 2026"
        />
      </div>

      {mode === "create" ? (
        <div className="space-y-2">
          <Label>Organisation</Label>
          <Select value={organisationId} onValueChange={setOrganisationId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une organisation…" />
            </SelectTrigger>
            <SelectContent>
              {organisations.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="nb_priorites">Nombre maximum de priorités</Label>
        <Input
          id="nb_priorites"
          type="number"
          min={1}
          max={5}
          value={nbPriorites}
          onChange={(e) => setNbPriorites(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">Entre 1 et 5.</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="allow_multiple"
          type="checkbox"
          checked={allowMultipleInter}
          onChange={(e) => setAllowMultipleInter(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="allow_multiple" className="cursor-pointer">
          Autoriser plusieurs RDV intermédiaires
        </Label>
      </div>

      {mode === "edit" ? (
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as SessionStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archivée</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            L&apos;activation de session avec envoi d&apos;invitations arrivera en Phase 2b.
          </p>
        </div>
      ) : null}

      {ui.kind === "error" ? (
        <p className="text-sm text-destructive">{ui.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={ui.kind === "saving" || (mode === "create" && !organisationId)}
        >
          {ui.kind === "saving"
            ? "Enregistrement…"
            : mode === "create"
              ? "Créer la session"
              : "Enregistrer"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
