import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTandemPairAccess } from "@/lib/tandem-auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { nextStatusOnValidate } from "@/lib/tandem-workflow";
import type { TandemStatus, ValidatableStage } from "@/types/tandem";

const Schema = z.object({
  stage: z.enum(["rdv_initial", "rdv_inter", "rdv_final"]),
});

/**
 * Valide l'étape courante. N ou N+1 peut déclencher la validation ; le premier
 * arrivé verrouille l'étape. L'auteur et l'horodatage sont enregistrés.
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
    return NextResponse.json({ error: "stage invalide" }, { status: 400 });
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

  // Empreinte de validation (RLS: insert autorisé pour les membres du binôme)
  const { error: insertErr } = await supabase
    .from("tandem_validations")
    .insert({ tandem_pair_id: pairId, stage, validated_by: auth.access.userId });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Verrouille les entries de l'étape + bascule le statut
  const { data: doc } = await admin
    .from("tandem_documents")
    .select("id")
    .eq("tandem_pair_id", pairId)
    .maybeSingle();
  if (doc) {
    // Pour rdv_final, on verrouille AUSSI plan_action (remplies ensemble)
    const stagesToLock = stage === "rdv_final" ? ["rdv_final", "plan_action"] : [stage];
    await admin
      .from("tandem_entries")
      .update({ is_locked: true })
      .eq("document_id", doc.id)
      .in("stage", stagesToLock);
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
