import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { SessionForm } from "@/components/admin/SessionForm";

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

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{session.name}</h1>
          <p className="text-muted-foreground text-sm">
            {organisation?.display_name ?? "Organisation inconnue"}
          </p>
        </div>
        <Badge variant={session.status === "active" ? "success" : "secondary"}>
          {session.status === "active"
            ? "Active"
            : session.status === "archived"
              ? "Archivée"
              : "Brouillon"}
        </Badge>
      </header>

      <section className="mb-10 max-w-2xl">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Paramètres
        </h2>
        <SessionForm
          mode="edit"
          session={session}
          organisations={organisations ?? []}
        />
      </section>

      <section className="max-w-2xl rounded-lg border bg-muted/30 p-6">
        <h2 className="font-semibold">Prochaines étapes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rattacher animateurs, participants/managers, groupes et créer les binômes N/N+1 :
          cette partie arrive dans la Phase 2b.
        </p>
      </section>
    </div>
  );
}
