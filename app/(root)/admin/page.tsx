import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CalendarDays, Users } from "lucide-react";

export default async function AdminHomePage() {
  const supabase = await createClient();

  const [{ count: orgCount }, { count: sessionCount }, { count: userCount }] = await Promise.all([
    supabase.from("organisations").select("id", { count: "exact", head: true }),
    supabase.from("sessions").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Administration</h1>
        <p className="text-muted-foreground text-sm">
          Vue d&apos;ensemble de la plateforme.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          href="/admin/organisations"
          icon={<Building2 className="h-5 w-5" />}
          label="Organisations"
          value={orgCount ?? 0}
        />
        <StatCard
          href="/admin/sessions"
          icon={<CalendarDays className="h-5 w-5" />}
          label="Sessions"
          value={sessionCount ?? 0}
        />
        <StatCard
          href="/admin/users"
          icon={<Users className="h-5 w-5" />}
          label="Utilisateurs"
          value={userCount ?? 0}
        />
      </div>
    </div>
  );
}

function StatCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Link href={href}>
      <Card className="transition hover:border-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
