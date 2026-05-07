"use client";

import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrgOption = { id: string; display_name: string };

const NONE = "__none__";

export function UserRowActions({
  user,
  organisations,
}: {
  user: {
    id: string;
    role: string;
    organisation_id: string | null;
    is_active: boolean;
  };
  organisations: OrgOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [orgDialog, setOrgDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>(
    user.organisation_id ?? NONE
  );
  const [error, setError] = useState<string | null>(null);

  const isRootRole = user.role === "admin" || user.role === "animateur";

  async function toggleActive() {
    setPending(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    setPending(false);
    setOpen(false);
    if (res.ok) router.refresh();
  }

  async function changeOrganisation() {
    setPending(true);
    setError(null);
    const orgIdValue = selectedOrg === NONE ? null : selectedOrg;
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organisation_id: orgIdValue }),
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Erreur ${res.status}`);
      return;
    }
    setOrgDialog(false);
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
          <div className="absolute right-0 z-50 mt-1 w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            {!isRootRole ? (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  setSelectedOrg(user.organisation_id ?? NONE);
                  setError(null);
                  setOrgDialog(true);
                }}
                className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                Changer d&apos;organisation…
              </button>
            ) : null}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleActive();
              }}
              disabled={pending}
              className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
            >
              {user.is_active ? "Désactiver" : "Réactiver"}
            </button>
          </div>
        ) : null}
      </div>

      <Dialog open={orgDialog} onOpenChange={setOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer d&apos;organisation</DialogTitle>
            <DialogDescription>
              Réaffecter l&apos;utilisateur à une autre organisation. Si
              l&apos;utilisateur est déjà membre d&apos;une session de son
              ancienne organisation, ces liens deviendront orphelins — pense à
              le retirer manuellement de ses sessions avant ou après.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Organisation</label>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>(aucune — détaché)</SelectItem>
                {organisations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOrgDialog(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button
              onClick={changeOrganisation}
              disabled={
                pending || selectedOrg === (user.organisation_id ?? NONE)
              }
            >
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
