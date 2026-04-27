import Link from "next/link";
import { redirect } from "next/navigation";
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
import type { TandemStatus } from "@/types/tandem";

export const metadata = { title: "Mes sessions — Tandem" };

const SESSION_STATUS_LABEL: Record<
  string,
  { label: string; variant: "success" | "muted" | "secondary" }
> = {
  draft: { label: "Brouillon", variant: "secondary" },
  active: { label: "Active", variant: "success" },
  archived: { label: "Archivée", variant: "muted" },
};

export default async function AnimateurHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) redirect("/login?error=inactive");
  if (profile.role !== "animateur" && profile.role !== "admin") {
    redirect("/dashboard");
  }

  // RLS : sessions filtrées automatiquement aux sessions où je suis animateur.
  // (Admin verra toutes les sessions — utile pour le support.)
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, organisation_id, status, created_at")
    .order("created_at", { ascending: false });

  const sessionRows = sessions ?? [];
  const sessionIds = sessionRows.map((s) => s.id);
  const orgIds = Array.from(
    new Set(sessionRows.map((s) => s.organisation_id))
  );

  const [{ data: orgs }, { data: pairs }] = await Promise.all([
    orgIds.length > 0
      ? supabase
          .from("organisations")
          .select("id, display_name")
          .in("id", orgIds)
      : Promise.resolve({
          data: [] as { id: string; display_name: string }[],
        }),
    sessionIds.length > 0
      ? supabase
          .from("tandem_pairs")
          .select("session_id, tandem_status")
          .in("session_id", sessionIds)
      : Promise.resolve({
          data: [] as { session_id: string; tandem_status: string }[],
        }),
  ]);

  const orgsById = new Map((orgs ?? []).map((o) => [o.id, o.display_name]));
  const pairsBySession = new Map<
    string,
    { total: number; completed: number; inProgress: number }
  >();
  for (const p of pairs ?? []) {
    const cur = pairsBySession.get(p.session_id) ?? {
      total: 0,
      completed: 0,
      inProgress: 0,
    };
    cur.total += 1;
    const status = p.tandem_status as TandemStatus;
    if (status === "completed") cur.completed += 1;
    else if (status !== "not_started") cur.inProgress += 1;
    pairsBySession.set(p.session_id, cur);
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <Link
        href="/dashboard"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Dashboard
      </Link>
      <header className="mt-4 mb-8 space-y-1">
        <p className="text-muted-foreground text-sm uppercase tracking-wide">
          Animateur
        </p>
        <h1 className="text-3xl font-semibold">
          Bonjour {profile.first_name} {profile.last_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Vos sessions de formation et leurs binômes.
        </p>
      </header>

      {sessionRows.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            Aucune session ne vous est rattachée pour le moment.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Avancement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionRows.map((s) => {
                const statusMeta =
                  SESSION_STATUS_LABEL[s.status ?? "draft"] ??
                  SESSION_STATUS_LABEL.draft!;
                const counts = pairsBySession.get(s.id) ?? {
                  total: 0,
                  completed: 0,
                  inProgress: 0,
                };
                const pct =
                  counts.total === 0
                    ? 0
                    : Math.round((counts.completed / counts.total) * 100);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/animateur/sessions/${s.id}`}
                        className="hover:underline"
                      >
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {orgsById.get(s.organisation_id) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMeta.variant}>
                        {statusMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {counts.total === 0 ? (
                        <span className="text-muted-foreground">
                          Aucun binôme
                        </span>
                      ) : (
                        <span>
                          <strong>{counts.completed}</strong> / {counts.total}{" "}
                          terminés
                          <span className="ml-2 text-muted-foreground">
                            ({pct}%)
                          </span>
                        </span>
                      )}
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
