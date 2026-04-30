import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendRelanceEmail } from "@/lib/brevo";

const Schema = z.object({
  message: z.string().max(2000).optional(),
});

/**
 * Envoi d'une relance manuelle par un animateur aux deux membres d'un binôme.
 *
 * Auth :
 *  - L'utilisateur doit être animateur de la session (ou admin).
 *  - La pair doit appartenir à la session ciblée.
 *
 * Effet : un email est envoyé à N et à N+1 avec un lien direct vers leur
 * Tandem et un message libre optionnel saisi par l'animateur.
 */
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; pairId: string }>;
  }
) {
  const { id: sessionId, pairId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (profile.role !== "animateur" && profile.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (profile.role === "animateur") {
    const { data: link } = await supabase
      .from("session_animateurs")
      .select("session_id")
      .eq("session_id", sessionId)
      .eq("animateur_id", user.id)
      .maybeSingle();
    if (!link) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const customMessage = parsed.data.message?.trim() || null;

  const admin = createAdminClient();

  const { data: pair } = await admin
    .from("tandem_pairs")
    .select("id, session_id, participant_id, manager_id")
    .eq("id", pairId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!pair) {
    return NextResponse.json({ error: "pair_not_found" }, { status: 404 });
  }

  const { data: session } = await admin
    .from("sessions")
    .select("name, organisation_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const { data: organisation } = await admin
    .from("organisations")
    .select("slug")
    .eq("id", session.organisation_id)
    .maybeSingle();
  if (!organisation) {
    return NextResponse.json(
      { error: "organisation_not_found" },
      { status: 404 }
    );
  }

  const { data: members } = await admin
    .from("profiles")
    .select("id, email, first_name")
    .in("id", [pair.participant_id, pair.manager_id]);

  const animateurName = `${profile.first_name} ${profile.last_name}`;
  const sent: string[] = [];
  const failed: string[] = [];

  for (const member of members ?? []) {
    if (!member.email) continue;
    try {
      await sendRelanceEmail({
        recipient: { email: member.email, name: member.first_name },
        firstName: member.first_name,
        animateurName,
        sessionName: session.name,
        organisationSlug: organisation.slug,
        pairId: pair.id,
        customMessage,
      });
      sent.push(member.email);
    } catch (err) {
      console.error(
        `[animateur-relance] email to ${member.email} failed:`,
        err
      );
      failed.push(member.email);
    }
  }

  if (sent.length === 0) {
    return NextResponse.json(
      { error: "no_email_sent", failed },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent, failed });
}
