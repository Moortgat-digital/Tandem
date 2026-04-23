"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeSlug } from "@/lib/slug";
import type { Organisation } from "@/types/tandem";

type Mode = "create" | "edit";

export function OrganisationForm({
  mode,
  organisation,
}: {
  mode: Mode;
  organisation?: Organisation;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(organisation?.display_name ?? "");
  const [slug, setSlug] = useState(organisation?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(organisation?.slug));
  const [primaryColor, setPrimaryColor] = useState(
    organisation?.primary_color ?? "#1B3A6B"
  );
  const [logoUrl, setLogoUrl] = useState(organisation?.logo_url ?? "");
  const [contactEmail, setContactEmail] = useState(organisation?.contact_email ?? "");
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  function handleDisplayNameChange(value: string) {
    setDisplayName(value);
    if (!slugTouched) setSlug(normalizeSlug(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "saving" });

    const body = {
      display_name: displayName,
      slug: normalizeSlug(slug),
      primary_color: primaryColor,
      logo_url: logoUrl.trim() || null,
      contact_email: contactEmail.trim() || null,
    };

    const url =
      mode === "create"
        ? "/api/admin/organisations"
        : `/api/admin/organisations/${organisation!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ kind: "error", message: data.error ?? `Erreur ${res.status}` });
      return;
    }

    router.push("/admin/organisations");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="display_name">Nom affiché</Label>
        <Input
          id="display_name"
          required
          value={displayName}
          onChange={(e) => handleDisplayNameChange(e.target.value)}
          placeholder="Exemple — Groupe ABC"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug URL</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">tandem-moortgat.vercel.app/</span>
          <Input
            id="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            onBlur={(e) => setSlug(normalizeSlug(e.target.value))}
            placeholder="groupe-abc"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Lettres minuscules, chiffres et tirets uniquement.
        </p>
      </div>

      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div className="space-y-2">
          <Label htmlFor="primary_color">Couleur</Label>
          <Input
            id="primary_color"
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-9 cursor-pointer p-1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="primary_color_hex">Valeur HEX</Label>
          <Input
            id="primary_color_hex"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#1B3A6B"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo_url">URL du logo</Label>
        <Input
          id="logo_url"
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://…"
        />
        <p className="text-xs text-muted-foreground">Optionnel. PNG/SVG recommandés.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_email">Email de contact</Label>
        <Input
          id="contact_email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="contact@exemple.com"
        />
      </div>

      {status.kind === "error" ? (
        <p className="text-sm text-destructive">{status.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={status.kind === "saving"}>
          {status.kind === "saving"
            ? "Enregistrement…"
            : mode === "create"
              ? "Créer l'organisation"
              : "Enregistrer"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
