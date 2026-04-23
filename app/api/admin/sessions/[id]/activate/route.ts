import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Active une session. Prérequis minimum :
 *  - au moins un animateur rattaché
 *  - au moins un binôme N / N+1 créé
 *
 * L'envoi des invitations email (Brevo) est planifié en Phase 2c.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: sessionId } = await params;
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }
  if (session.status === "active") {
    return NextResponse.json({ error: "La session est déjà active" }, { status: 409 });
  }

  const [{ count: animateurCount }, { count: pairCount }] = await Promise.all([
    admin
      .from("session_animateurs")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId),
    admin
      .from("tandem_pairs")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId),
  ]);

  if ((animateurCount ?? 0) < 1) {
    return NextResponse.json(
      { error: "Ajoute au moins un animateur avant d'activer la session" },
      { status: 400 }
    );
  }
  if ((pairCount ?? 0) < 1) {
    return NextResponse.json(
      { error: "Crée au moins un binôme N/N+1 avant d'activer la session" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("sessions")
    .update({ status: "active" })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}
