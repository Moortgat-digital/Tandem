"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RelanceButton({
  sessionId,
  pairId,
  participantName,
  managerName,
}: {
  sessionId: string;
  pairId: string;
  participantName: string;
  managerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "error"; message: string }
    | { kind: "success"; sent: number; failed: number }
  >({ kind: "idle" });

  async function send() {
    setPending(true);
    setResult({ kind: "idle" });
    const res = await fetch(
      `/api/animateur/sessions/${sessionId}/pairs/${pairId}/relance`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: message.trim() || undefined }),
      }
    );
    setPending(false);
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      sent?: string[];
      failed?: string[];
    };
    if (!res.ok) {
      setResult({
        kind: "error",
        message: data.error ?? `Erreur ${res.status}`,
      });
      return;
    }
    setResult({
      kind: "success",
      sent: (data.sent ?? []).length,
      failed: (data.failed ?? []).length,
    });
  }

  function reset() {
    setOpen(false);
    setMessage("");
    setResult({ kind: "idle" });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Bell className="h-3.5 w-3.5" />
        Relancer
      </Button>
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : reset())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relancer le binôme</DialogTitle>
            <DialogDescription>
              Un email sera envoyé à <strong>{participantName}</strong> et{" "}
              <strong>{managerName}</strong> avec un lien direct vers leur Tandem.
            </DialogDescription>
          </DialogHeader>

          {result.kind === "success" ? (
            <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
              {result.sent} email{result.sent > 1 ? "s" : ""} envoyé
              {result.sent > 1 ? "s" : ""}.
              {result.failed > 0 ? (
                <span className="block mt-1 text-amber-800">
                  {result.failed} échec{result.failed > 1 ? "s" : ""} — vérifie
                  les logs côté admin.
                </span>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="relance-message">Message (optionnel)</Label>
              <Textarea
                id="relance-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex. : N'oubliez pas de programmer votre prochain RDV…"
                className="min-h-[100px]"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                Si vide, le mail contiendra uniquement la formule générique.
              </p>
              {result.kind === "error" ? (
                <p className="text-sm text-destructive">{result.message}</p>
              ) : null}
            </div>
          )}

          <DialogFooter>
            {result.kind === "success" ? (
              <Button onClick={reset}>Fermer</Button>
            ) : (
              <>
                <Button variant="outline" onClick={reset} disabled={pending}>
                  Annuler
                </Button>
                <Button onClick={send} disabled={pending}>
                  {pending ? "Envoi…" : "Envoyer la relance"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
