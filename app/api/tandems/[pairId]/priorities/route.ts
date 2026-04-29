import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTandemPairAccess } from "@/lib/tandem-auth";
import { createClient } from "@/lib/supabase/server";

const UpsertSchema = z
  .object({
    position: z.number().int().min(1).max(5),
    title: z.string().min(1).max(200).optional(),
    kpi: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .refine((v) => v.title !== undefined || v.kpi !== undefined, {
    message: "title ou kpi requis",
  });

/**
 * Upsert d'une priorité (colonne).
 *  - title : créé pendant le RDV initial, conservé en lecture seule ensuite.
 *  - kpi   : modifiable à tout moment par N ou N+1.
 * Si la row n'existe pas encore, `title` doit être fourni (NOT NULL en BDD).
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

  const { data: existing } = await supabase
    .from("tandem_priorities")
    .select("id, title, kpi")
    .eq("document_id", doc.id)
    .eq("position", parsed.data.position)
    .maybeSingle();

  if (!existing) {
    if (parsed.data.title === undefined) {
      return NextResponse.json(
        { error: "title_required_for_new_priority" },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("tandem_priorities")
      .insert({
        document_id: doc.id,
        position: parsed.data.position,
        title: parsed.data.title,
        kpi: parsed.data.kpi ?? null,
      })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ priority: data });
  }

  const update: { title?: string; kpi?: string | null } = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.kpi !== undefined) update.kpi = parsed.data.kpi;

  const { data, error } = await supabase
    .from("tandem_priorities")
    .update(update)
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ priority: data });
}
