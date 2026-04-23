"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ActivateSessionButton({
  sessionId,
  disabled = false,
}: {
  sessionId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/sessions/${sessionId}/activate`, {
      method: "POST",
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Erreur ${res.status}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button onClick={activate} disabled={disabled || pending}>
        {pending ? "Activation…" : "Activer la session"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
