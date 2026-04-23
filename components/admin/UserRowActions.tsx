"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserRowActions({ user }: { user: { id: string; is_active: boolean } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

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
  );
}
