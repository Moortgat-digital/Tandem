import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="font-semibold">Prochaine étape</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Le formulaire Tandem sera disponible ici dès qu&apos;une session sera activée.
        </p>
      </section>
    </main>
  );
}
