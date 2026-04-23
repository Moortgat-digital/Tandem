import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Building2, CalendarDays, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="border-r bg-muted/30 p-4">
        <div className="mb-6 space-y-0.5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Administration</p>
          <p className="text-sm font-medium">
            {profile.first_name} {profile.last_name}
          </p>
        </div>

        <nav className="space-y-1">
          <NavItem href="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>
            Vue d&apos;ensemble
          </NavItem>
          <NavItem href="/admin/organisations" icon={<Building2 className="h-4 w-4" />}>
            Organisations
          </NavItem>
          <NavItem href="/admin/sessions" icon={<CalendarDays className="h-4 w-4" />}>
            Sessions
          </NavItem>
          <NavItem href="/admin/users" icon={<Users className="h-4 w-4" />}>
            Utilisateurs
          </NavItem>
        </nav>

        <div className="mt-auto pt-8">
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Dashboard
          </Link>
        </div>
      </aside>

      <main className="overflow-auto">{children}</main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
