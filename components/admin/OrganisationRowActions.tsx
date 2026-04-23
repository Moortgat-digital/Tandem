"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Organisation } from "@/types/tandem";

export function OrganisationRowActions({ organisation }: { organisation: Organisation }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

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

  return (
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
        <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border bg-popover p-1 shadow-md">
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
        </div>
      ) : null}
    </div>
  );
}
