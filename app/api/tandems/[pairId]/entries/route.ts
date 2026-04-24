import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTandemPairAccess } from "@/lib/tandem-auth";
import { createClient } from "@/lib/supabase/server";
import { editableStages, openNextStage } from "@/lib/tandem-workflow";
import { createAdminClient } from "@/lib/supabase/server";
import type { TandemStage, TandemStatus } from "@/types/tandem";

const Schema = z.object({
  priority_pos: z.number().int().min(1).max(5),
  stage: z.enum(["rdv_initial", "rdv_inter", "rdv_final", "plan_action"]),
  content: z.string().max(10_000),
});

/**
 * Upsert du contenu d'une cellule.
 * - Refuse si la cellule n'est pas éditable au statut courant.
 * - À la première édition d'une étape validated_X, on passe en in_progress_Y.
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

  // Vérifie que la priorité existe (pas d'édition sur colonne vide)
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
      { error: "Nomme d'abord cette priorité avant de saisir son contenu" },
      { status: 400 }
    );
  }

  // Ouvre l'étape suivante si on était dans un statut "validated_X"
  const nextStatus = openNextStage(currentStatus);
  if (nextStatus !== currentStatus) {
    await admin.from("tandem_pairs").update({ tandem_status: nextStatus }).eq("id", pairId);
  }

  // Upsert entry
  const { data, error } = await supabase
    .from("tandem_entries")
    .upsert(
      {
        document_id: doc.id,
        priority_pos: parsed.data.priority_pos,
        stage: parsed.data.stage,
        content: parsed.data.content,
        updated_by: auth.access.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "document_id,priority_pos,stage" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data, status: nextStatus });
}
