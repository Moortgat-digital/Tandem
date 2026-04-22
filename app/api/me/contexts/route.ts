import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserContext, UserRole } from "@/types/tandem";

/**
 * Détection dynamique du double-rôle N / N+1.
 * Un même utilisateur peut apparaître comme participant dans un tandem_pair
 * et comme manager dans un autre. On renvoie les deux rôles s'il cumule.
 */
export async function GET(): Promise<NextResponse<{ context: UserContext } | { error: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "no_profile" }, { status: 404 });

  const role = profile.role as UserRole;

  if (role === "admin" || role === "animateur") {
    return NextResponse.json({ context: { kind: "root", role } });
  }

  if (!profile.tenant_id) {
    return NextResponse.json({ error: "tenant_missing" }, { status: 400 });
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  }

  const [{ count: participantCount }, { count: managerCount }] = await Promise.all([
    supabase
      .from("tandem_pairs")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", user.id),
    supabase
      .from("tandem_pairs")
      .select("id", { count: "exact", head: true })
      .eq("manager_id", user.id),
  ]);

  const roles: ("participant" | "manager")[] = [];
  if ((participantCount ?? 0) > 0 || role === "participant") roles.push("participant");
  if ((managerCount ?? 0) > 0 || role === "manager") roles.push("manager");
  if (roles.length === 0) {
    roles.push(role === "manager" ? "manager" : "participant");
  }

  return NextResponse.json({
    context: {
      kind: "tenant",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      roles,
    },
  });
}
