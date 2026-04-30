import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { sendSessionActivationEmail } from "@/lib/brevo";

/**
 * Active une session. Prérequis minimum :
 *  - au moins un animateur rattaché
 *  - au moins un binôme N / N+1 créé
 *
 * Après activation, un email est envoyé à chaque membre des binômes.
 * Les échecs d'envoi n'empêchent pas l'activation : on log et on continue.
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
    .select("id, name, status, organisation_id")
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

  // Notifications par email — best effort, ne bloque pas l'activation.
  void notifyPairMembers({
    sessionId,
    sessionName: session.name,
    organisationId: session.organisation_id,
  }).catch((err) => {
    console.error("[session-activation] notifyPairMembers failed:", err);
  });

  return NextResponse.json({ session: data });
}

async function notifyPairMembers(input: {
  sessionId: string;
  sessionName: string;
  organisationId: string;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: organisation } = await admin
    .from("organisations")
    .select("slug")
    .eq("id", input.organisationId)
    .maybeSingle();
  if (!organisation) return;

  const { data: pairs } = await admin
    .from("tandem_pairs")
    .select("participant_id, manager_id")
    .eq("session_id", input.sessionId);

  const memberIds = Array.from(
    new Set(
      (pairs ?? []).flatMap((p) => [p.participant_id, p.manager_id])
    )
  );
  if (memberIds.length === 0) return;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, first_name")
    .in("id", memberIds);

  for (const profile of profiles ?? []) {
    if (!profile.email) continue;
    try {
      await sendSessionActivationEmail({
        recipient: { email: profile.email, name: profile.first_name },
        firstName: profile.first_name,
        sessionName: input.sessionName,
        organisationSlug: organisation.slug,
      });
    } catch (err) {
      console.error(
        `[session-activation] email to ${profile.email} failed:`,
        err
      );
    }
  }
}
