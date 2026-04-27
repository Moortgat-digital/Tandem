import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusLabel } from "@/lib/tandem-workflow";
import type { TandemStatus } from "@/types/tandem";

export const metadata = { title: "Session — Tandem" };

const PAIR_BADGE: Record<
  TandemStatus,
  { variant: "success" | "secondary" | "muted"; label: string }
> = {
  not_started: { variant: "muted", label: "Pas démarré" },
  in_progress_rdv_initial: { variant: "secondary", label: "RDV initial en cours" },
  validated_1: { variant: "success", label: "RDV initial validé" },
  in_progress_rdv_inter: { variant: "secondary", label: "RDV inter en cours" },
  validated_inter: { variant: "success", label: "RDV inter validé" },
  in_progress_rdv_final: { variant: "secondary", label: "RDV final en cours" },
  completed: { variant: "success", label: "Parcours terminé" },
};

export default async function AnimateurSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // RLS : l'animateur ne voit la session que si sa policy l'autorise.
  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, organisation_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const { data: organisation } = await supabase
    .from("organisations")
    .select("display_name")
    .eq("id", session.organisation_id)
    .maybeSingle();

  const { data: pairs } = await supabase
    .from("tandem_pairs")
    .select(
      "id, participant_id, manager_id, tandem_status, created_at"
    )
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const pairRows = pairs ?? [];
  const profileIds = Array.from(
    new Set(
      pairRows.flatMap((p) => [p.participant_id, p.manager_id]).filter(Boolean)
    )
  );

  const profilesById = new Map<
    string,
    { first_name: string; last_name: string }
  >();
  if (profileIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", profileIds);
    for (const p of profilesData ?? []) {
      profilesById.set(p.id, {
        first_name: p.first_name,
        last_name: p.last_name,
      });
    }
  }

  // Dernière mise à jour de chaque binôme : max(updated_at) des entries.
  const pairIds = pairRows.map((p) => p.id);
  const lastEditByPair = new Map<string, string>();
  if (pairIds.length > 0) {
    const { data: documents } = await supabase
      .from("tandem_documents")
      .select("id, tandem_pair_id")
      .in("tandem_pair_id", pairIds);
    const docToPair = new Map(
      (documents ?? []).map((d) => [d.id, d.tandem_pair_id])
    );
    const docIds = (documents ?? []).map((d) => d.id);
    if (docIds.length > 0) {
      const { data: entries } = await supabase
        .from("tandem_entries")
        .select("document_id, updated_at")
        .in("document_id", docIds);
      for (const e of entries ?? []) {
        if (!e.updated_at) continue;
        const pairId = docToPair.get(e.document_id);
        if (!pairId) continue;
        const cur = lastEditByPair.get(pairId);
        if (!cur || e.updated_at > cur) {
          lastEditByPair.set(pairId, e.updated_at);
        }
      }
    }
  }

  const totals = {
    total: pairRows.length,
    completed: pairRows.filter((p) => p.tandem_status === "completed").length,
    inProgress: pairRows.filter(
      (p) =>
        p.tandem_status !== "not_started" && p.tandem_status !== "completed"
    ).length,
    notStarted: pairRows.filter((p) => p.tandem_status === "not_started").length,
  };

  return (
    <main className="mx-auto max-w-6xl p-8">
      <Link
        href="/animateur"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Mes sessions
      </Link>
      <header className="mt-4 mb-6 space-y-1">
        <p className="text-muted-foreground text-sm uppercase tracking-wide">
          {organisation?.display_name ?? "Organisation"}
        </p>
        <h1 className="text-3xl font-semibold">{session.name}</h1>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Binômes" value={totals.total} />
        <Stat label="Pas démarré" value={totals.notStarted} muted />
        <Stat label="En cours" value={totals.inProgress} />
        <Stat label="Terminés" value={totals.completed} success />
      </section>

      {pairRows.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            Aucun binôme dans cette session.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant (N)</TableHead>
                <TableHead>Manager (N+1)</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière édition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pairRows.map((p) => {
                const participant = profilesById.get(p.participant_id);
                const manager = profilesById.get(p.manager_id);
                const status = p.tandem_status as TandemStatus;
                const badge = PAIR_BADGE[status] ?? PAIR_BADGE.not_started;
                const last = lastEditByPair.get(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/animateur/sessions/${id}/tandems/${p.id}`}
                        className="hover:underline"
                      >
                        {participant
                          ? `${participant.first_name} ${participant.last_name}`
                          : "—"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {manager
                        ? `${manager.first_name} ${manager.last_name}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>
                        {statusLabel(status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {last ? formatDateTime(last) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  muted,
  success,
}: {
  label: string;
  value: number;
  muted?: boolean;
  success?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          success
            ? "mt-1 text-2xl font-semibold text-emerald-700"
            : muted
              ? "mt-1 text-2xl font-semibold text-muted-foreground"
              : "mt-1 text-2xl font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
