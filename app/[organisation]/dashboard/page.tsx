import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { TandemLogo } from "@/components/brand/TandemLogo";
import { TandemTimeline } from "@/components/tandem/TandemTimeline";
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

  // Charge profils, sessions, documents et validations rdv_inter pour
  // pouvoir afficher la timeline chronologique de chaque binôme.
  const otherUserIds = Array.from(
    new Set(
      allPairs.flatMap((p) =>
        p.participant_id === user.id ? [p.manager_id] : [p.participant_id]
      )
    )
  );
  const sessionIds = Array.from(new Set(allPairs.map((p) => p.session_id)));
  const pairIds = allPairs.map((p) => p.id);

  const [
    { data: profiles },
    { data: sessions },
    { data: documents },
    { data: interValidations },
  ] = await Promise.all([
    otherUserIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", otherUserIds)
      : Promise.resolve({
          data: [] as { id: string; first_name: string; last_name: string }[],
        }),
    sessionIds.length > 0
      ? supabase
          .from("sessions")
          .select("id, name, status")
          .in("id", sessionIds)
      : Promise.resolve({
          data: [] as { id: string; name: string; status: string | null }[],
        }),
    pairIds.length > 0
      ? supabase
          .from("tandem_documents")
          .select(
            "tandem_pair_id, date_premiere_journee, date_premier_rdv, dates_rdv_inter, date_dernier_rdv"
          )
          .in("tandem_pair_id", pairIds)
      : Promise.resolve({
          data: [] as {
            tandem_pair_id: string;
            date_premiere_journee: string | null;
            date_premier_rdv: string | null;
            dates_rdv_inter: string[] | null;
            date_dernier_rdv: string | null;
          }[],
        }),
    pairIds.length > 0
      ? supabase
          .from("tandem_validations")
          .select("tandem_pair_id")
          .in("tandem_pair_id", pairIds)
          .eq("stage", "rdv_inter")
      : Promise.resolve(
          { data: [] as { tandem_pair_id: string }[] }
        ),
  ]);

  const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const sessionsById = new Map((sessions ?? []).map((s) => [s.id, s]));
  const documentsByPair = new Map(
    (documents ?? []).map((d) => [d.tandem_pair_id, d])
  );
  const nbValidatedInterByPair = new Map<string, number>();
  for (const v of interValidations ?? []) {
    nbValidatedInterByPair.set(
      v.tandem_pair_id,
      (nbValidatedInterByPair.get(v.tandem_pair_id) ?? 0) + 1
    );
  }

  const pairsWithContext = allPairs.map((p) => {
    const isParticipant = p.participant_id === user.id;
    const other = isParticipant
      ? profilesById.get(p.manager_id)
      : profilesById.get(p.participant_id);
    const session = sessionsById.get(p.session_id);
    const document = documentsByPair.get(p.id);
    const nbValidatedInter = nbValidatedInterByPair.get(p.id) ?? 0;
    return {
      ...p,
      isParticipant,
      other,
      session,
      document,
      nbValidatedInter,
    };
  });

  const activePairs = pairsWithContext.filter(
    (p) => p.tandem_status !== "completed"
  );
  const completedPairs = pairsWithContext.filter(
    (p) => p.tandem_status === "completed"
  );

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="bg-navy text-white">
        <div className="mx-auto max-w-5xl px-8 py-10">
          <div className="flex items-center gap-4">
            <TandemLogo size="lg" />
            <div className="space-y-1">
              <p className="text-coral text-xs font-semibold uppercase tracking-wider">
                {profile.role === "participant" ? "Participant" : "Manager"}
              </p>
              <h1 className="text-3xl font-semibold">
                Bonjour {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-white/70 text-sm">
                Bienvenue dans ton espace de suivi Tandem.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-8 pt-8 pb-12">
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-coral">
            Tandems en cours
          </h2>
          {activePairs.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Aucun Tandem actif. Dès qu&apos;une session sera activée et qu&apos;un binôme sera
              créé, il apparaîtra ici.
            </p>
          ) : (
            <ul className="space-y-4">
              {activePairs.map((p) => (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-lg border-l-4 border-coral bg-card shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4 p-5">
                    <div>
                      <p className="font-semibold">
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
                        className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:opacity-90"
                      >
                        Ouvrir
                      </Link>
                    </div>
                  </div>
                  {p.document ? (
                    <div className="border-t bg-muted/20 px-5 py-4">
                      <TandemTimeline
                        status={p.tandem_status as TandemStatus}
                        datePremiereJournee={p.document.date_premiere_journee}
                        datePremierRdv={p.document.date_premier_rdv}
                        datesRdvInter={p.document.dates_rdv_inter ?? []}
                        dateDernierRdv={p.document.date_dernier_rdv}
                        nbValidatedInter={p.nbValidatedInter}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {completedPairs.length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-coral">
              Parcours terminés
            </h2>
            <ul className="space-y-4">
              {completedPairs.map((p) => (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-lg border-l-4 border-emerald-500 bg-card shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4 p-5">
                    <div>
                      <p className="font-semibold">
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
                  </div>
                  {p.document ? (
                    <div className="border-t bg-muted/20 px-5 py-4">
                      <TandemTimeline
                        status={p.tandem_status as TandemStatus}
                        datePremiereJournee={p.document.date_premiere_journee}
                        datePremierRdv={p.document.date_premier_rdv}
                        datesRdvInter={p.document.dates_rdv_inter ?? []}
                        dateDernierRdv={p.document.date_dernier_rdv}
                        nbValidatedInter={p.nbValidatedInter}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="border-t pt-8">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-coral">
            À propos de Tandem
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Tandem est l&apos;outil collaboratif de suivi de votre parcours de formation
            Moortgat. Vous y remplissez à deux — collaborateur et manager — un compte
            rendu structuré à chaque RDV clé.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-lg border-t-4 border-coral bg-card p-5 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-coral">
                Caractéristiques
              </p>
              <ul className="space-y-1.5 text-sm">
                <li>Compte rendu structuré en priorités personnalisables</li>
                <li>Trois étapes : RDV initial, intermédiaire, final</li>
                <li>Édition simultanée à deux, en temps réel</li>
                <li>Validation conjointe à chaque étape</li>
              </ul>
            </article>
            <article className="rounded-lg border-t-4 border-coral bg-card p-5 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-coral">
                Avantages
              </p>
              <ul className="space-y-1.5 text-sm">
                <li>Plus de fichiers Word qui circulent par mail</li>
                <li>Une seule version, toujours à jour</li>
                <li>Données hébergées en Europe, accès limité au binôme</li>
                <li>Historique des validations conservé automatiquement</li>
              </ul>
            </article>
            <article className="rounded-lg border-t-4 border-coral bg-card p-5 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-coral">
                Bénéfices
              </p>
              <ul className="space-y-1.5 text-sm">
                <li>Un cap clair sur chaque priorité de progression</li>
                <li>Un fil rouge entre les RDVs, sans rien perdre</li>
                <li>Un plan d&apos;action concret à la fin du parcours</li>
                <li>Un appui durable à votre développement professionnel</li>
              </ul>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
