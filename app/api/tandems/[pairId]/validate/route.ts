import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTandemPairAccess } from "@/lib/tandem-auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { nextStatusOnValidate } from "@/lib/tandem-workflow";
import type { TandemStatus, ValidatableStage } from "@/types/tandem";

const Schema = z
  .object({
    stage: z.enum(["rdv_initial", "rdv_inter", "rdv_final"]),
    inter_index: z.number().int().min(1).max(3).optional(),
  })
  .refine(
    (v) => (v.stage === "rdv_inter" ? v.inter_index !== undefined : true),
    { message: "inter_index requis pour stage='rdv_inter'" }
  )
  .refine(
    (v) => (v.stage !== "rdv_inter" ? v.inter_index === undefined : true),
    { message: "inter_index interdit hors stage='rdv_inter'" }
  );

/**
 * Valide l'étape courante. N ou N+1 peut déclencher la validation ; le
 * premier arrivé verrouille l'étape. L'auteur et l'horodatage sont
 * enregistrés. Pour rdv_inter, on précise inter_index : seules les entries
 * de cet inter sont verrouillées, les autres inters restent éditables.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ pairId: string }> }
) {
  const { pairId } = await params;
  const auth = await requireTandemPairAccess(pairId);
  if (!auth.ok) return auth.response;

  if (auth.access.role === "admin") {
    return NextResponse.json(
      { error: "L'admin doit utiliser l'endpoint de forçage dédié" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const currentStatus = auth.access.pair.tandem_status as TandemStatus;
  const stage = parsed.data.stage as ValidatableStage;
  const nextStatus = nextStatusOnValidate(currentStatus, stage);
  if (!nextStatus) {
    return NextResponse.json(
      { error: "Cette étape ne peut pas être validée au statut courant" },
      { status: 409 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // Pour rdv_inter, vérifie qu'on valide bien l'inter en cours
  // (= nb validations existantes + 1, sans dépasser 3).
  if (stage === "rdv_inter") {
    const { count: validatedInterCount } = await supabase
      .from("tandem_validations")
      .select("id", { count: "exact", head: true })
      .eq("tandem_pair_id", pairId)
      .eq("stage", "rdv_inter");
    const openInterIndex = (validatedInterCount ?? 0) + 1;
    if (parsed.data.inter_index !== openInterIndex) {
      return NextResponse.json(
        {
          error: `RDV intermédiaire en cours : N°${openInterIndex} (reçu N°${parsed.data.inter_index})`,
        },
        { status: 409 }
      );
    }
    if (openInterIndex > 3) {
      return NextResponse.json(
        { error: "3 RDV intermédiaires déjà validés" },
        { status: 409 }
      );
    }
  }

  const interIndex = stage === "rdv_inter" ? (parsed.data.inter_index ?? 0) : 0;

  const { error: insertErr } = await supabase
    .from("tandem_validations")
    .insert({
      tandem_pair_id: pairId,
      stage,
      validated_by: auth.access.userId,
      inter_index: interIndex,
    });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Verrouille les entries de l'étape (et de l'inter_index pour rdv_inter)
  const { data: doc } = await admin
    .from("tandem_documents")
    .select("id")
    .eq("tandem_pair_id", pairId)
    .maybeSingle();
  if (doc) {
    if (stage === "rdv_inter") {
      await admin
        .from("tandem_entries")
        .update({ is_locked: true })
        .eq("document_id", doc.id)
        .eq("stage", "rdv_inter")
        .eq("inter_index", interIndex);
    } else {
      const stagesToLock =
        stage === "rdv_final" ? ["rdv_final", "plan_action"] : [stage];
      await admin
        .from("tandem_entries")
        .update({ is_locked: true })
        .eq("document_id", doc.id)
        .in("stage", stagesToLock);
    }
  }

  const { data: pair, error: updErr } = await admin
    .from("tandem_pairs")
    .update({ tandem_status: nextStatus })
    .eq("id", pairId)
    .select()
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ pair });
}
