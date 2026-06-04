import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

const UpdateSchema = z
  .object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    is_active: z.boolean().optional(),
    organisation_id: z.string().uuid().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Aucun champ à mettre à jour" });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}

/**
 * Suppression complète d'un utilisateur.
 *  - admin.auth.admin.deleteUser supprime l'auth user
 *  - le profile suit en CASCADE (FK profiles.id → auth.users.id ON DELETE CASCADE)
 *  - session_animateurs, session_members, tandem_pairs (et tout ce qui en
 *    dépend) suivent en CASCADE
 *  - updated_by / validated_by / audit_logs.admin_id passent à NULL
 *    (préservation de l'historique)
 *
 * Refuse la suppression du compte de l'admin connecté.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (id === auth.userId) {
    return NextResponse.json(
      { error: "Tu ne peux pas supprimer ton propre compte." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
