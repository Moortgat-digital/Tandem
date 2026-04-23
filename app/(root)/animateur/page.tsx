import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AnimateurHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login?error=no_profile");

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
        ← Dashboard
      </Link>
      <header className="mt-4 mb-8 space-y-1">
        <p className="text-muted-foreground text-sm uppercase tracking-wide">Animateur</p>
        <h1 className="text-3xl font-semibold">Mes participants</h1>
      </header>
      <section className="rounded-lg border bg-muted/30 p-8 text-center">
        <p className="font-medium">Espace Animateur — Phase 5</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Liste des participants par session, consultation des formulaires, relances par
          email. Accessible dès la Phase 5.
        </p>
      </section>
    </main>
  );
}
