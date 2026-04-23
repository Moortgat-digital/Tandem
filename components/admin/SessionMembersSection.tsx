"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

export type SessionMember = {
  id: string;
  user_id: string;
  role_in_session: "participant" | "manager";
  profile: Profile | null;
};

export function SessionMembersSection({
  sessionId,
  members,
  availableProfiles,
}: {
  sessionId: string;
  members: SessionMember[];
  availableProfiles: Profile[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [selectedRole, setSelectedRole] = useState<"participant" | "manager">(
    "participant"
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const participants = members.filter((m) => m.role_in_session === "participant");
  const managers = members.filter((m) => m.role_in_session === "manager");

  async function handleAdd() {
    if (!selectedProfile) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/sessions/${sessionId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        user_id: selectedProfile,
        role_in_session: selectedRole,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Erreur ${res.status}`);
      return;
    }
    setOpen(false);
    setSelectedProfile("");
    router.refresh();
  }

  async function handleRemove(memberId: string) {
    await fetch(`/api/admin/sessions/${sessionId}/members/${memberId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Membres ({members.length})
        </h2>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un membre
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <MembersList
          title="Participants (N)"
          members={participants}
          onRemove={handleRemove}
          emptyLabel="Aucun participant."
        />
        <MembersList
          title="Managers (N+1)"
          members={managers}
          onRemove={handleRemove}
          emptyLabel="Aucun manager."
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un membre</DialogTitle>
            <DialogDescription>
              Choisis un profil de l&apos;organisation et son rôle dans cette session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Rôle dans la session</label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as "participant" | "manager")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">Participant (N)</SelectItem>
                  <SelectItem value="manager">Manager (N+1)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Profil</label>
              {availableProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun profil disponible dans cette organisation.
                </p>
              ) : (
                <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un utilisateur…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} — {p.email}
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
            <Button disabled={!selectedProfile || pending} onClick={handleAdd}>
              {pending ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function MembersList({
  title,
  members,
  onRemove,
  emptyLabel,
}: {
  title: string;
  members: SessionMember[];
  onRemove: (memberId: string) => void;
  emptyLabel: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {title}{" "}
        <Badge variant="muted" className="ml-1">
          {members.length}
        </Badge>
      </p>
      {members.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  {m.profile?.first_name} {m.profile?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(m.id)}
                aria-label="Retirer"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
