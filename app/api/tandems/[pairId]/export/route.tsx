import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { TandemPdfDocument, type TandemPdfData } from "@/lib/tandem-pdf";
import type { TandemStage, TandemStatus } from "@/types/tandem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Export PDF de l'intégralité du compte rendu Tandem.
 * Accessible :
 *  - aux deux membres du binôme (N et N+1)
 *  - à l'admin
 *  - à un animateur de la session
 * Le filtre RLS sur les SELECT du Supabase client confirme l'accès en lecture
 * pour les rôles autorisés ; on s'appuie dessus + une vérification explicite.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pairId: string }> }
) {
  const { pairId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: pair } = await supabase
    .from("tandem_pairs")
    .select("id, participant_id, manager_id, session_id, tandem_status")
    .eq("id", pairId)
    .maybeSingle();
  if (!pair) {
    return NextResponse.json({ error: "pair_not_found" }, { status: 404 });
  }

  // Auth : pair member, admin, ou animateur de la session
  const isMember =
    pair.participant_id === user.id || pair.manager_id === user.id;
  let allowed = isMember;
  if (!allowed) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role === "admin") allowed = true;
    if (profile?.role === "animateur") {
      const { data: link } = await supabase
        .from("session_animateurs")
        .select("session_id")
        .eq("session_id", pair.session_id)
        .eq("animateur_id", user.id)
        .maybeSingle();
      if (link) allowed = true;
    }
  }
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [
    { data: document },
    { data: participant },
    { data: manager },
    { data: session },
  ] = await Promise.all([
    supabase
      .from("tandem_documents")
      .select(
        "id, date_premiere_journee, date_premier_rdv, dates_rdv_inter, date_dernier_rdv, attentes_participant, attentes_manager"
      )
      .eq("tandem_pair_id", pair.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", pair.participant_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", pair.manager_id)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("name, organisation_id")
      .eq("id", pair.session_id)
      .maybeSingle(),
  ]);

  if (!document || !participant || !manager || !session) {
    return NextResponse.json({ error: "data_missing" }, { status: 404 });
  }

  const [{ data: organisation }, { data: priorities }, { data: entries }] =
    await Promise.all([
      supabase
        .from("organisations")
        .select("display_name")
        .eq("id", session.organisation_id)
        .maybeSingle(),
      supabase
        .from("tandem_priorities")
        .select("position, title, kpi")
        .eq("document_id", document.id)
        .order("position"),
      supabase
        .from("tandem_entries")
        .select(
          "priority_pos, stage, inter_index, content, acquisition_pct"
        )
        .eq("document_id", document.id),
    ]);

  const data: TandemPdfData = {
    organisationName: organisation?.display_name ?? "Moortgat",
    sessionName: session.name,
    status: pair.tandem_status as TandemStatus,
    participantName: `${participant.first_name} ${participant.last_name}`,
    managerName: `${manager.first_name} ${manager.last_name}`,
    attentes: {
      participant: document.attentes_participant ?? "",
      manager: document.attentes_manager ?? "",
    },
    dates: {
      premiereJournee: document.date_premiere_journee,
      premierRdv: document.date_premier_rdv,
      rdvInter: document.dates_rdv_inter ?? [],
      dernierRdv: document.date_dernier_rdv,
    },
    priorities: (priorities ?? []).map((p) => ({
      position: p.position,
      title: p.title,
      kpi: p.kpi ?? "",
    })),
    entries: (entries ?? []).map((e) => ({
      priorityPos: e.priority_pos,
      stage: e.stage as TandemStage,
      interIndex: e.inter_index,
      content: e.content ?? "",
      acquisitionPct: e.acquisition_pct,
    })),
  };

  const stream = await renderToStream(<TandemPdfDocument data={data} />);

  const filename = sanitizeFilename(
    `Tandem - ${data.participantName} x ${data.managerName}.pdf`
  );

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^A-Za-z0-9 .×x_-]/g, "").slice(0, 120);
}
