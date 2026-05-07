"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Organisation } from "@/types/tandem";

export function OrganisationRowActions({
  organisation,
  attachedProfilesCount,
}: {
  organisation: Organisation;
  attachedProfilesCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAttachedProfiles = attachedProfilesCount > 0;

  async function toggleActive() {
    setPending(true);
    const res = await fetch(`/api/admin/organisations/${organisation.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: !organisation.is_active }),
    });
    setPending(false);
    setOpen(false);
    if (res.ok) router.refresh();
  }

  async function deleteOrganisation() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/organisations/${organisation.id}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Erreur ${res.status}`);
      return;
    }
    setConfirmDelete(false);
    router.refresh();
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        {open ? (
          <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
            <Link
              href={`/admin/organisations/${organisation.id}`}
              className="block rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              Éditer
            </Link>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleActive();
              }}
              disabled={pending}
              className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
            >
              {organisation.is_active ? "Archiver" : "Réactiver"}
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                setError(null);
                setConfirmDelete(true);
              }}
              className="block w-full rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
            >
              Supprimer…
            </button>
          </div>
        ) : null}
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;organisation ?</DialogTitle>
            <DialogDescription>
              {hasAttachedProfiles ? (
                <>
                  <strong>{attachedProfilesCount} utilisateur
                  {attachedProfilesCount > 1 ? "s sont" : " est"}</strong>{" "}
                  encore rattaché{attachedProfilesCount > 1 ? "s" : ""} à{" "}
                  <strong>{organisation.display_name}</strong>. Réaffecte-
                  {attachedProfilesCount > 1 ? "les" : "le"} à une autre
                  organisation (ou supprime-{attachedProfilesCount > 1 ? "les" : "le"})
                  avant de pouvoir supprimer cette organisation.
                </>
              ) : (
                <>
                  <strong>{organisation.display_name}</strong> sera
                  définitivement supprimée, ainsi que{" "}
                  <strong>toutes ses sessions</strong>, leurs binômes et leurs
                  comptes rendus Tandem. Cette action est irréversible.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
            >
              {hasAttachedProfiles ? "Fermer" : "Annuler"}
            </Button>
            {hasAttachedProfiles ? (
              <Button
                onClick={() => router.push("/admin/users")}
                disabled={pending}
              >
                Aller à la liste Utilisateurs
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={deleteOrganisation}
                disabled={pending}
              >
                {pending ? "Suppression…" : "Supprimer définitivement"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
