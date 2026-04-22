"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic_link";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "magic_sent" }
  >({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "loading" });
    const supabase = createClient();

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus({ kind: "error", message: error.message });
        return;
      }
      router.push(redirectTo);
      router.refresh();
      return;
    }

    const redirect = new URL(
      "/auth/callback",
      process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    );
    redirect.searchParams.set("next", redirectTo);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect.toString() },
    });
    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setStatus({ kind: "magic_sent" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2"
        />
      </div>

      {mode === "password" ? (
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2"
          />
        </div>
      ) : null}

      {status.kind === "error" ? (
        <p className="text-destructive text-sm">{status.message}</p>
      ) : null}
      {status.kind === "magic_sent" ? (
        <p className="text-sm text-green-700">
          Un lien de connexion vient de vous être envoyé par email.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status.kind === "loading"}
        className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90 disabled:opacity-60"
      >
        {status.kind === "loading"
          ? "Connexion…"
          : mode === "password"
            ? "Se connecter"
            : "Recevoir un lien de connexion"}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "password" ? "magic_link" : "password")}
        className="text-muted-foreground hover:text-foreground w-full text-center text-xs underline-offset-4 hover:underline"
      >
        {mode === "password"
          ? "Plutôt recevoir un lien par email"
          : "Utiliser mon mot de passe"}
      </button>
    </form>
  );
}
