import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTandemPairAccess } from "@/lib/tandem-auth";
import { createClient } from "@/lib/supabase/server";
import { editableStages, openNextStage } from "@/lib/tandem-workflow";
import { createAdminClient } from "@/lib/supabase/server";
import type { TandemStage, TandemStatus } from "@/types/tandem";

const Schema = z
  .object({
    priority_pos: z.number().int().min(1).max(5),
    stage: z.enum(["rdv_initial", "rdv_inter", "rdv_final", "plan_action"]),
    content: z.string().max(10_000),
    inter_index: z.number().int().min(1).max(3).optional(),
    acquisition_pct: z.number().int().min(1).max(10).nullable().optional(),
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
 * Upsert du contenu d'une cellule.
 * - Refuse si l'étape n'est pas éditable au statut courant.
 * - Pour rdv_inter, refuse si l'inter_index ciblé n'est pas le prochain
 *   à remplir (= nb_validations_inter + 1).
 * - À la première édition d'un statut "validated_X", on bascule en
 *   "in_progress_Y" en fonction de l'étape éditée.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ pairId: string }> }
) {
  const { pairId } = await params;
  const auth = await requireTandemPairAccess(pairId);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const currentStatus = auth.access.pair.tandem_status as TandemStatus;
  const allowed: readonly TandemStage[] = editableStages(currentStatus);
  if (!allowed.includes(parsed.data.stage)) {
    return NextResponse.json(
      { error: "Cette étape n'est pas éditable au statut courant" },
      { status: 409 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: doc } = await supabase
    .from("tandem_documents")
    .select("id")
    .eq("tandem_pair_id", pairId)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: "document_not_found" }, { status: 404 });

  const { data: priority } = await supabase
    .from("tandem_priorities")
    .select("id")
    .eq("document_id", doc.id)
    .eq("position", parsed.data.priority_pos)
    .maybeSingle();
  if (!priority) {
    return NextResponse.json(
      { error: "Nomme d'abord cet axe de travail avant de saisir son contenu" },
      { status: 400 }
    );
  }

  // Pour rdv_inter, vérifie que l'inter_index ciblé est ouvert :
  // c'est l'occurrence en cours (= nb validations inter + 1).
  if (parsed.data.stage === "rdv_inter") {
    const { count: validatedInterCount } = await supabase
      .from("tandem_validations")
      .select("id", { count: "exact", head: true })
      .eq("tandem_pair_id", pairId)
      .eq("stage", "rdv_inter");
    const openInterIndex = (validatedInterCount ?? 0) + 1;
    if (parsed.data.inter_index !== openInterIndex) {
      return NextResponse.json(
        {
          error: `Cet RDV intermédiaire n'est pas ouvert (en cours : N°${openInterIndex})`,
        },
        { status: 409 }
      );
    }
  }

  const nextStatus = openNextStage(currentStatus, parsed.data.stage);
  if (nextStatus !== currentStatus) {
    await admin.from("tandem_pairs").update({ tandem_status: nextStatus }).eq("id", pairId);
  }

  const interIndex =
    parsed.data.stage === "rdv_inter" ? (parsed.data.inter_index ?? 0) : 0;

  const upsertData: {
    document_id: string;
    priority_pos: number;
    stage: string;
    inter_index: number;
    content: string;
    updated_by: string;
    updated_at: string;
    acquisition_pct?: number | null;
  } = {
    document_id: doc.id,
    priority_pos: parsed.data.priority_pos,
    stage: parsed.data.stage,
    inter_index: interIndex,
    content: parsed.data.content,
    updated_by: auth.access.userId,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.acquisition_pct !== undefined) {
    upsertData.acquisition_pct = parsed.data.acquisition_pct;
  }

  const { data, error } = await supabase
    .from("tandem_entries")
    .upsert(upsertData, {
      onConflict: "document_id,priority_pos,stage,inter_index",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data, status: nextStatus });
}
