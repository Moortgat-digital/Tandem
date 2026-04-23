import { createClient } from "@/lib/supabase/server";

/**
 * Vérifie que l'appelant est un Admin authentifié et actif.
 * À utiliser en tête de chaque route API sous `/api/admin/*` et des Server
 * Components sous `app/(root)/admin/*`.
 *
 * Renvoie { ok: true, userId, supabase } pour enchaîner, ou renvoie une
 * NextResponse d'erreur à renvoyer tel quel.
 */
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.is_active || profile.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true, userId: user.id };
}
