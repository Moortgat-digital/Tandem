import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTandemPairAccess } from "@/lib/tandem-auth";
import { createClient } from "@/lib/supabase/server";

const UpsertSchema = z.object({
  position: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200),
});

/**
 * Crée ou renomme la priorité (colonne) à la position donnée.
 * Pendant le RDV initial, les priorités sont définies. Elles sont conservées
 * ensuite en lecture seule.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ pairId: string }> }
) {
  const { pairId } = await params;
  const auth = await requireTandemPairAccess(pairId);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("tandem_documents")
    .select("id")
    .eq("tandem_pair_id", pairId)
    .maybeSingle();
  if (!doc) {
    return NextResponse.json({ error: "document_not_found" }, { status: 404 });
  }

  // Upsert by (document_id, position)
  const { data, error } = await supabase
    .from("tandem_priorities")
    .upsert(
      {
        document_id: doc.id,
        position: parsed.data.position,
        title: parsed.data.title,
      },
      { onConflict: "document_id,position" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ priority: data });
}
