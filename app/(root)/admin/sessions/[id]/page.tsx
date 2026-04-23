import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { SessionForm } from "@/components/admin/SessionForm";
import { SessionAnimateursSection } from "@/components/admin/SessionAnimateursSection";
import {
  SessionMembersSection,
  type SessionMember,
} from "@/components/admin/SessionMembersSection";
import {
  SessionPairsSection,
  type PairRow,
} from "@/components/admin/SessionPairsSection";
import { ActivateSessionButton } from "@/components/admin/ActivateSessionButton";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!session) notFound();

  const { data: organisations } = await supabase
    .from("organisations")
    .select("id, display_name")
    .order("display_name");

  const organisation =
    organisations?.find((o) => o.id === session.organisation_id) ?? null;

  // Animateurs rattachés + disponibles
  const { data: sessionAnimateurs } = await supabase
    .from("session_animateurs")
    .select("id, animateur_id")
    .eq("session_id", id);

  const attachedAnimateurIds = new Set(
    (sessionAnimateurs ?? []).map((sa) => sa.animateur_id)
  );

  const { data: allAnimateurs } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("role", "animateur")
    .eq("is_active", true)
    .order("last_name");

  const attachedAnimateurs = (allAnimateurs ?? []).filter((a) =>
    attachedAnimateurIds.has(a.id)
  );
  const availableAnimateurs = (allAnimateurs ?? []).filter(
    (a) => !attachedAnimateurIds.has(a.id)
  );

  // Membres session (+ profils)
  const { data: membersRaw } = await supabase
    .from("session_members")
    .select("id, user_id, role_in_session")
    .eq("session_id", id);

  const memberUserIds = (membersRaw ?? []).map((m) => m.user_id);
  const { data: memberProfilesRaw } =
    memberUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, role")
          .in("id", memberUserIds)
      : { data: [] as { id: string; first_name: string; last_name: string; email: string; role: string }[] };
  const memberProfiles = memberProfilesRaw ?? [];

  const profilesById = new Map(memberProfiles.map((p) => [p.id, p]));

  const members: SessionMember[] = (membersRaw ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role_in_session: m.role_in_session as "participant" | "manager",
    profile: profilesById.get(m.user_id) ?? null,
  }));

  // Profils disponibles (même organisation, role participant/manager, pas encore membres)
  const memberUserIdSet = new Set(memberUserIds);
  const { data: orgProfiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role")
    .eq("organisation_id", session.organisation_id)
    .in("role", ["participant", "manager"])
    .eq("is_active", true)
    .order("last_name");

  const availableProfiles = (orgProfiles ?? []).filter(
    (p) => !memberUserIdSet.has(p.id)
  );

  // Binômes
  const { data: pairsRaw } = await supabase
    .from("tandem_pairs")
    .select("id, participant_id, manager_id, tandem_status")
    .eq("session_id", id);

  const pairProfileIds = Array.from(
    new Set(
      (pairsRaw ?? []).flatMap((p) => [p.participant_id, p.manager_id])
    )
  );
  const { data: pairProfilesRaw } =
    pairProfileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", pairProfileIds)
      : { data: [] as { id: string; first_name: string; last_name: string; email: string }[] };
  const pairProfilesById = new Map(
    (pairProfilesRaw ?? []).map((p) => [p.id, p])
  );

  const pairs: PairRow[] = (pairsRaw ?? []).map((p) => ({
    id: p.id,
    participant: pairProfilesById.get(p.participant_id) ?? null,
    manager: pairProfilesById.get(p.manager_id) ?? null,
    tandem_status: p.tandem_status,
  }));

  const participantsAvailable = members
    .filter((m) => m.role_in_session === "participant" && m.profile)
    .map((m) => ({
      id: m.profile!.id,
      first_name: m.profile!.first_name,
      last_name: m.profile!.last_name,
      email: m.profile!.email,
    }));
  const managersAvailable = members
    .filter((m) => m.role_in_session === "manager" && m.profile)
    .map((m) => ({
      id: m.profile!.id,
      first_name: m.profile!.first_name,
      last_name: m.profile!.last_name,
      email: m.profile!.email,
    }));

  const canActivate =
    session.status !== "active" &&
    attachedAnimateurs.length > 0 &&
    pairs.length > 0;

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{session.name}</h1>
          <p className="text-muted-foreground text-sm">
            {organisation?.display_name ?? "Organisation inconnue"}
          </p>
        </div>
        <Badge
          variant={
            session.status === "active"
              ? "success"
              : session.status === "archived"
                ? "muted"
                : "secondary"
          }
        >
          {session.status === "active"
            ? "Active"
            : session.status === "archived"
              ? "Archivée"
              : "Brouillon"}
        </Badge>
      </header>

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-10">
          <SessionAnimateursSection
            sessionId={session.id}
            attached={attachedAnimateurs}
            available={availableAnimateurs}
          />

          <SessionMembersSection
            sessionId={session.id}
            members={members}
            availableProfiles={availableProfiles}
          />

          <SessionPairsSection
            sessionId={session.id}
            pairs={pairs}
            participantsAvailable={participantsAvailable}
            managersAvailable={managersAvailable}
          />
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Paramètres
            </h2>
            <SessionForm
              mode="edit"
              session={session}
              organisations={organisations ?? []}
            />
          </section>

          {session.status !== "active" ? (
            <section className="rounded-lg border bg-muted/30 p-6">
              <h2 className="mb-2 font-semibold">Activer la session</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Prérequis : au moins un animateur rattaché et au moins un binôme N/N+1
                créé. L&apos;envoi des emails d&apos;invitation arrivera en Phase 2c.
              </p>
              <ActivateSessionButton
                sessionId={session.id}
                disabled={!canActivate}
              />
              {!canActivate ? (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {attachedAnimateurs.length === 0 ? (
                    <li>• Rattache au moins un animateur</li>
                  ) : null}
                  {pairs.length === 0 ? <li>• Crée au moins un binôme</li> : null}
                </ul>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
