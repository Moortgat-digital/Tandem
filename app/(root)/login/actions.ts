"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  const loginPath = String(formData.get("login_path") ?? "/login");

  if (!email || !password) {
    redirect(
      `${loginPath}?error=${encodeURIComponent("Email et mot de passe requis")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`${loginPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function sendMagicLinkAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "/dashboard");
  const loginPath = String(formData.get("login_path") ?? "/login");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!email) {
    redirect(`${loginPath}?error=${encodeURIComponent("Email requis")}`);
  }

  const redirectUrl = new URL("/auth/callback", appUrl || "http://localhost:3000");
  redirectUrl.searchParams.set("next", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl.toString() },
  });

  if (error) {
    redirect(`${loginPath}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${loginPath}?magic_sent=1`);
}
