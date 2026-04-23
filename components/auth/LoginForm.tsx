"use client";

import { useState } from "react";
import {
  signInWithPasswordAction,
  sendMagicLinkAction,
} from "@/app/(root)/login/actions";

type Mode = "password" | "magic_link";

export function LoginForm({
  redirectTo,
  loginPath = "/login",
  error,
  magicSent = false,
}: {
  redirectTo: string;
  loginPath?: string;
  error?: string;
  magicSent?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("password");

  return (
    <form
      action={mode === "password" ? signInWithPasswordAction : sendMagicLinkAction}
      className="space-y-4"
    >
      <input type="hidden" name="next" value={redirectTo} />
      <input type="hidden" name="login_path" value={loginPath} />

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
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
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2"
          />
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {magicSent ? (
        <p className="text-sm text-green-700">
          Un lien de connexion vient de vous être envoyé par email.
        </p>
      ) : null}

      <button
        type="submit"
        className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90 disabled:opacity-60"
      >
        {mode === "password" ? "Se connecter" : "Recevoir un lien de connexion"}
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
