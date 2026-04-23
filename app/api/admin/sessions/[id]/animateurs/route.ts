import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

const Schema = z.object({ animateur_id: z.string().uuid() });

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
    return NextResponse.json({ error: "animateur_id manquant ou invalide" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: animateur } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", parsed.data.animateur_id)
    .maybeSingle();
  if (!animateur || animateur.role !== "animateur" || !animateur.is_active) {
    return NextResponse.json({ error: "Profil animateur introuvable ou inactif" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("session_animateurs")
    .insert({ session_id: sessionId, animateur_id: parsed.data.animateur_id })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Cet animateur est déjà rattaché" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ session_animateur: data }, { status: 201 });
}
