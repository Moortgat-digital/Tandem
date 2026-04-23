import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

const Schema = z.object({
  user_id: z.string().uuid(),
  role_in_session: z.enum(["participant", "manager"]),
  group_id: z.string().uuid().nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: sessionId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verify session + profile belong to the same organisation
  const [{ data: session }, { data: profile }] = await Promise.all([
    admin.from("sessions").select("organisation_id").eq("id", sessionId).maybeSingle(),
    admin
      .from("profiles")
      .select("organisation_id, role, is_active")
      .eq("id", parsed.data.user_id)
      .maybeSingle(),
  ]);

  if (!session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }
  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "Profil introuvable ou inactif" }, { status: 400 });
  }
  if (profile.organisation_id !== session.organisation_id) {
    return NextResponse.json(
      { error: "Le profil n'appartient pas à la même organisation que la session" },
      { status: 400 }
    );
  }
  if (profile.role !== "participant" && profile.role !== "manager") {
    return NextResponse.json(
      { error: "Seuls les participants et managers peuvent être membres d'une session" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("session_members")
    .insert({
      session_id: sessionId,
      user_id: parsed.data.user_id,
      role_in_session: parsed.data.role_in_session,
      group_id: parsed.data.group_id ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Cet utilisateur est déjà membre avec ce rôle" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: data }, { status: 201 });
}
