import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { TandemGrid } from "@/components/tandem/TandemGrid";
import { statusLabel } from "@/lib/tandem-workflow";
import type { TandemStage, TandemStatus } from "@/types/tandem";

export const metadata = { title: "Consultation Tandem — Tandem" };

export default async function AnimateurTandemReadOnlyPage({
  params,
}: {
  params: Promise<{ id: string; pairId: string }>;
}) {
  const { id: sessionId, pairId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) redirect("/login?error=inactive");
  if (profile.role !== "animateur" && profile.role !== "admin") {
    redirect("/dashboard");
  }

  // RLS : retourne la pair seulement si je suis animateur de la session
  // (ou admin). Le filtre session_id en plus blinde l'URL : impossible
  // d'accéder à une pair d'une autre session via l'URL.
  const { data: pair } = await supabase
    .from("tandem_pairs")
    .select(
      "id, participant_id, manager_id, session_id, tandem_status"
    )
    .eq("id", pairId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!pair) notFound();

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

  const realStatus = pair.tandem_status as TandemStatus;
  const isCompleted = realStatus === "completed";

  return (
    <main className="mx-auto max-w-7xl p-6">
      <Link
        href={`/animateur/sessions/${sessionId}`}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Retour à la session
      </Link>

      <header className="mt-4 mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {session.name} · Consultation animateur
          </p>
          <h1 className="text-2xl font-semibold">
            Tandem — {participant.first_name} {participant.last_name} ×{" "}
            {manager.first_name} {manager.last_name}
          </h1>
        </div>
        <Badge variant={isCompleted ? "success" : "secondary"}>
          {statusLabel(realStatus)}
        </Badge>
      </header>

      <div className="mb-4 rounded-md border bg-amber-50 p-3 text-sm text-amber-900">
        Vue lecture seule. Vous ne pouvez pas modifier ce compte rendu — seuls
        le participant et son manager y ont accès en édition.
      </div>

      <div className="space-y-6">
        <section className="rounded-lg border bg-card p-6">
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <DateField label="Participant (N)">
              {participant.first_name} {participant.last_name}
            </DateField>
            <DateField label="Manager (N+1)">
              {manager.first_name} {manager.last_name}
            </DateField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DateField label="1ère journée">
              {formatDate(document.date_premiere_journee)}
            </DateField>
            <DateField label="1er RDV Tandem">
              {formatDate(document.date_premier_rdv)}
            </DateField>
            <DateField label="RDV intermédiaires">
              {(document.dates_rdv_inter ?? []).length === 0
                ? "—"
                : (document.dates_rdv_inter ?? [])
                    .map((d) => formatDate(d))
                    .join(", ")}
            </DateField>
            <DateField label="Dernier RDV">
              {formatDate(document.date_dernier_rdv)}
            </DateField>
          </div>
        </section>

        {/* status='completed' force editable=[] et visibleStages=4 lignes */}
        <TandemGrid
          pairId={pair.id}
          status="completed"
          nbPrioritesMax={session.nb_priorites_max ?? 5}
          priorities={priorities ?? []}
          entries={(entries ?? []).map((e) => ({
            priority_pos: e.priority_pos,
            stage: e.stage as TandemStage,
            content: e.content,
            is_locked: e.is_locked,
          }))}
        />
      </div>
    </main>
  );
}

function DateField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{children}</p>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
