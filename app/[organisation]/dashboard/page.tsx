import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/tandem-workflow";
import type { TandemStatus } from "@/types/tandem";

export default async function OrganisationDashboardPage({
  params,
}: {
  params: Promise<{ organisation: string }>;
}) {
  const { organisation: slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect(`/${slug}/login?error=no_profile`);

  // Toutes les paires où l'utilisateur apparaît (participant OU manager)
  const { data: pairsAsParticipant } = await supabase
    .from("tandem_pairs")
    .select("id, session_id, participant_id, manager_id, tandem_status")
    .eq("participant_id", user.id);

  const { data: pairsAsManager } = await supabase
    .from("tandem_pairs")
    .select("id, session_id, participant_id, manager_id, tandem_status")
    .eq("manager_id", user.id);

  const allPairs = [...(pairsAsParticipant ?? []), ...(pairsAsManager ?? [])];

  // Charge les profils et sessions liés
  const otherUserIds = Array.from(
    new Set(
      allPairs.flatMap((p) =>
        p.participant_id === user.id ? [p.manager_id] : [p.participant_id]
      )
    )
  );
  const sessionIds = Array.from(new Set(allPairs.map((p) => p.session_id)));

  const [{ data: profiles }, { data: sessions }] = await Promise.all([
    otherUserIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", otherUserIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
    sessionIds.length > 0
      ? supabase
          .from("sessions")
          .select("id, name, status")
          .in("id", sessionIds)
      : Promise.resolve({ data: [] as { id: string; name: string; status: string | null }[] }),
  ]);

  const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const sessionsById = new Map((sessions ?? []).map((s) => [s.id, s]));

  const pairsWithContext = allPairs.map((p) => {
    const isParticipant = p.participant_id === user.id;
    const other = isParticipant
      ? profilesById.get(p.manager_id)
      : profilesById.get(p.participant_id);
    const session = sessionsById.get(p.session_id);
    return {
      ...p,
      isParticipant,
      other,
      session,
    };
  });

  const activePairs = pairsWithContext.filter(
    (p) => p.tandem_status !== "completed"
  );
  const completedPairs = pairsWithContext.filter(
    (p) => p.tandem_status === "completed"
  );

  return (
    <main className="mx-auto max-w-5xl p-8">
      <header className="mb-8 space-y-1">
        <p className="text-muted-foreground text-sm uppercase tracking-wide">
          {profile.role === "participant" ? "Participant" : "Manager"}
        </p>
        <h1 className="text-3xl font-semibold">
          Bonjour {profile.first_name} {profile.last_name}
        </h1>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tandems en cours
        </h2>
        {activePairs.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Aucun Tandem actif. Dès qu&apos;une session sera activée et qu&apos;un binôme sera
            créé, il apparaîtra ici.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {activePairs.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">
                    {p.isParticipant ? "Avec " : "Suivi de "}
                    {p.other?.first_name} {p.other?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.session?.name ?? "Session"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    {statusLabel(p.tandem_status as TandemStatus)}
                  </Badge>
                  <Link
                    href={`/${slug}/tandem/${p.id}`}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
                  >
                    Ouvrir
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {completedPairs.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Parcours terminés
          </h2>
          <ul className="divide-y rounded-lg border bg-card">
            {completedPairs.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">
                    {p.other?.first_name} {p.other?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.session?.name ?? "Session"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="success">Terminé</Badge>
                  <Link
                    href={`/${slug}/tandem/${p.id}`}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    Consulter
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
