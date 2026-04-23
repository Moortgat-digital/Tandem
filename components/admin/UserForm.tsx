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
import type { UserRole } from "@/types/tandem";

type OrgOption = { id: string; display_name: string };

export function UserForm({ organisations }: { organisations: OrgOption[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole>("participant");
  const [organisationId, setOrganisationId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "error"; message: string }
    | { kind: "created"; tempPassword?: string }
  >({ kind: "idle" });

  const isRootRole = role === "admin" || role === "animateur";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "saving" });

    const body = {
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      organisation_id: isRootRole ? null : organisationId || null,
      password: password || undefined,
    };

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      temporary_password?: string;
    };

    if (!res.ok) {
      setStatus({ kind: "error", message: data.error ?? `Erreur ${res.status}` });
      return;
    }

    setStatus({ kind: "created", tempPassword: data.temporary_password });
  }

  if (status.kind === "created") {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <p className="font-medium">Utilisateur créé ✅</p>
        <p className="text-sm">
          {firstName} {lastName} — {email}
        </p>
        {status.tempPassword ? (
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Mot de passe temporaire</p>
            <code className="text-sm">{status.tempPassword}</code>
            <p className="mt-2 text-xs text-muted-foreground">
              Transmets-le à l&apos;utilisateur, il pourra le changer via &quot;mot de passe oublié&quot;.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Le mot de passe que tu as saisi a été utilisé.
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={() => router.push("/admin/users")}>Retour à la liste</Button>
          <Button
            variant="outline"
            onClick={() => {
              setEmail("");
              setFirstName("");
              setLastName("");
              setPassword("");
              setStatus({ kind: "idle" });
            }}
          >
            Créer un autre utilisateur
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Prénom</Label>
          <Input
            id="first_name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Nom</Label>
          <Input
            id="last_name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Rôle</Label>
        <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrateur</SelectItem>
            <SelectItem value="animateur">Animateur</SelectItem>
            <SelectItem value="participant">Participant (N)</SelectItem>
            <SelectItem value="manager">Manager (N+1)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isRootRole ? (
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
          {organisations.length === 0 ? (
            <p className="text-xs text-destructive">
              Aucune organisation active. Crée une organisation avant d&apos;ajouter un
              participant ou un manager.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe (optionnel)</Label>
        <Input
          id="password"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Laisser vide pour en générer un automatiquement"
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">
          Minimum 8 caractères. Si vide, un mot de passe temporaire sera généré et affiché.
        </p>
      </div>

      {status.kind === "error" ? (
        <p className="text-sm text-destructive">{status.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={
            status.kind === "saving" ||
            (!isRootRole && !organisationId)
          }
        >
          {status.kind === "saving" ? "Création…" : "Créer l'utilisateur"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
