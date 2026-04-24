import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type PairAccess = {
  userId: string;
  pair: {
    id: string;
    session_id: string;
    participant_id: string;
    manager_id: string;
    tandem_status: string;
  };
  role: "participant" | "manager" | "admin";
};

/**
 * Vérifie que l'appelant peut agir sur un binôme Tandem.
 *  - Participant ou Manager du binôme → autorisé
 *  - Admin racine → autorisé (audite / édite en mode forcé)
 * Sinon renvoie une NextResponse d'erreur.
 */
export async function requireTandemPairAccess(
  pairId: string
): Promise<{ ok: true; access: PairAccess } | { ok: false; response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }

  const { data: pair } = await supabase
    .from("tandem_pairs")
    .select("id, session_id, participant_id, manager_id, tandem_status")
    .eq("id", pairId)
    .maybeSingle();

  if (!pair) {
    return { ok: false, response: NextResponse.json({ error: "pair_not_found" }, { status: 404 }) };
  }

  if (pair.participant_id === user.id) {
    return { ok: true, access: { userId: user.id, pair, role: "participant" } };
  }
  if (pair.manager_id === user.id) {
    return { ok: true, access: { userId: user.id, pair, role: "manager" } };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "admin") {
    return { ok: true, access: { userId: user.id, pair, role: "admin" } };
  }

  return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
}
