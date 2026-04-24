import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/organisation";
import { Badge } from "@/components/ui/badge";
import { TandemHeader } from "@/components/tandem/TandemHeader";
import { TandemGrid } from "@/components/tandem/TandemGrid";
import { ValidateStageButton } from "@/components/tandem/ValidateStageButton";
import {
  currentEditableStage,
  statusLabel,
  stageLabel,
} from "@/lib/tandem-workflow";
import type { TandemStage, TandemStatus } from "@/types/tandem";

export default async function TandemPage({
  params,
}: {
  params: Promise<{ organisation: string; pairId: string }>;
}) {
  const { organisation: slug, pairId } = await params;
  const organisation = await getOrganisationBySlug(slug);
  if (!organisation) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/login`);

  const { data: pair } = await supabase
    .from("tandem_pairs")
    .select(
      "id, participant_id, manager_id, session_id, tandem_status"
    )
    .eq("id", pairId)
    .maybeSingle();

  if (!pair) notFound();

  const isMember = pair.participant_id === user.id || pair.manager_id === user.id;
  if (!isMember) redirect(`/${slug}/dashboard`);

  // Fetch in parallel
  const [
    { data: document },
    { data: participant },
    { data: manager },
    { data: session },
  ] = await Promise.all([
    supabase
      .from("tandem_documents")
      .select(
        "id, tandem_pair_id, date_premiere_journee, date_premier_rdv, dates_rdv_inter, date_dernier_rdv"
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
      .select("name, nb_priorites_max")
      .eq("id", pair.session_id)
      .maybeSingle(),
  ]);

  if (!document || !participant || !manager || !session) notFound();

  const [{ data: priorities }, { data: entries }] = await Promise.all([
    supabase
      .from("tandem_priorities")
      .select("position, title")
      .eq("document_id", document.id)
      .order("position"),
    supabase
      .from("tandem_entries")
      .select("priority_pos, stage, content, is_locked")
      .eq("document_id", document.id),
  ]);

  const status = pair.tandem_status as TandemStatus;
  const currentStage = currentEditableStage(status);
  const role: "participant" | "manager" =
    pair.participant_id === user.id ? "participant" : "manager";
  const isCompleted = status === "completed";
  const hasPriority = (priorities ?? []).some((p) => p.title.trim().length > 0);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-4 text-xs text-muted-foreground">
        <Link href={`/${slug}/dashboard`} className="hover:text-foreground">
          ← Dashboard
        </Link>
      </div>

      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {session.name} · {role === "participant" ? "Participant (N)" : "Manager (N+1)"}
          </p>
          <h1 className="text-2xl font-semibold">
            Tandem — {participant.first_name} {participant.last_name} × {manager.first_name}{" "}
            {manager.last_name}
          </h1>
        </div>
        <Badge variant={isCompleted ? "success" : "secondary"}>
          {statusLabel(status)}
        </Badge>
      </header>

      <div className="space-y-6">
        <TandemHeader
          pairId={pair.id}
          participantName={`${participant.first_name} ${participant.last_name}`}
          managerName={`${manager.first_name} ${manager.last_name}`}
          status={status}
          initial={{
            date_premiere_journee: document.date_premiere_journee,
            date_premier_rdv: document.date_premier_rdv,
            dates_rdv_inter: document.dates_rdv_inter ?? [],
            date_dernier_rdv: document.date_dernier_rdv,
          }}
        />

        <TandemGrid
          pairId={pair.id}
          status={status}
          nbPrioritesMax={session.nb_priorites_max ?? 5}
          priorities={priorities ?? []}
          entries={(entries ?? []).map((e) => ({
            priority_pos: e.priority_pos,
            stage: e.stage as TandemStage,
            content: e.content,
            is_locked: e.is_locked,
          }))}
        />

        {currentStage ? (
          <section className="rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Valider ce compte rendu</p>
                <p className="text-xs text-muted-foreground">
                  Étape en cours : <strong>{stageLabel(currentStage)}</strong>.
                  N ou N+1 peut valider ; la validation verrouille cette étape en lecture seule.
                </p>
              </div>
              <ValidateStageButton
                pairId={pair.id}
                stage={currentStage}
                disabled={!hasPriority}
                hint={
                  !hasPriority
                    ? "Nomme au moins une priorité avant de valider."
                    : undefined
                }
              />
            </div>
          </section>
        ) : (
          <section className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm">Parcours terminé — aucune édition supplémentaire.</p>
          </section>
        )}
      </div>
    </main>
  );
}
