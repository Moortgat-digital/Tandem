import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

const UpdateSchema = z
  .object({
    display_name: z.string().min(1).max(200).optional(),
    slug: z
      .string()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    logo_url: z.string().url().nullable().optional(),
    contact_email: z.string().email().nullable().optional(),
    is_active: z.boolean().optional(),
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
    .from("organisations")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ce slug est déjà utilisé" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ organisation: data });
}

/**
 * Suppression d'une organisation.
 *
 * Cascade DB (déjà en place) :
 *  - sessions ON DELETE CASCADE → tandem_pairs / documents / entries /
 *    validations / members / animateurs / formation_groups disparaissent
 *  - audit_logs sur tenant_id : ON DELETE SET NULL (préserve l'historique)
 *  - profiles ON DELETE CASCADE : on les détache AVANT (organisation_id =
 *    NULL) pour éviter de perdre les comptes auth — l'admin pourra les
 *    réaffecter à une autre org ou les supprimer un par un.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("organisations")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
  }

  // La contrainte CHECK `root_roles_have_no_organisation` impose qu'un
  // participant/manager ait toujours un organisation_id NOT NULL — on ne
  // peut donc pas se contenter de détacher. Si des profils sont attachés,
  // l'admin doit d'abord les réaffecter (ou les supprimer un par un).
  const { count: attachedCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", id);

  if ((attachedCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error: "attached_profiles",
        attached_profiles: attachedCount ?? 0,
        message: `${attachedCount} utilisateur(s) sont rattachés à cette organisation. Réaffecte-les ou supprime-les d'abord depuis la liste Utilisateurs.`,
      },
      { status: 409 }
    );
  }

  // Supprime l'organisation — la cascade DB nettoie sessions et tout ce
  // qui en dépend (binômes, documents, entries, validations, animateurs).
  const { error: deleteErr } = await admin
    .from("organisations")
    .delete()
    .eq("id", id);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
