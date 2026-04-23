import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Building2, Users } from "lucide-react";

export const metadata = { title: "Tableau de bord — Tandem" };

export default async function RootDashboardPage() {
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
    <main className="mx-auto max-w-5xl p-8">
      <header className="mb-8 space-y-1">
        <p className="text-muted-foreground text-sm uppercase tracking-wide">
          {profile.role === "admin" ? "Administrateur" : "Animateur"}
        </p>
        <h1 className="text-3xl font-semibold">
          Bonjour {profile.first_name} {profile.last_name}
        </h1>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {profile.role === "admin" ? (
          <Card
            title="Administration"
            description="Gérer les organisations, sessions et utilisateurs."
            href="/admin"
            icon={<Building2 className="h-5 w-5" />}
          />
        ) : null}
        <Card
          title="Mes participants"
          description="Consulter les formulaires et envoyer des relances."
          href="/animateur"
          icon={<Users className="h-5 w-5" />}
        />
      </section>
    </main>
  );
}

function Card({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border bg-card p-6 shadow-sm transition hover:border-primary"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </Link>
  );
}
