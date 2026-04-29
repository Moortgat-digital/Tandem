import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTandemPairAccess } from "@/lib/tandem-auth";
import { createClient } from "@/lib/supabase/server";

const DateOrNull = z.union([z.string().date(), z.null()]).optional();
const TextOrNull = z.union([z.string().max(5000), z.null()]).optional();

const Schema = z
  .object({
    date_premiere_journee: DateOrNull,
    date_premier_rdv: DateOrNull,
    dates_rdv_inter: z.array(z.string().date()).max(3).optional(),
    date_dernier_rdv: DateOrNull,
    attentes_participant: TextOrNull,
    attentes_manager: TextOrNull,
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Aucun champ à mettre à jour",
  });

export async function PATCH(
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

  // Verrou de rôle sur les champs Attentes :
  //  - attentes_participant ne peut être écrit que par le participant (ou admin)
  //  - attentes_manager     ne peut être écrit que par le manager     (ou admin)
  const { role } = auth.access;
  if (
    parsed.data.attentes_participant !== undefined &&
    role !== "participant" &&
    role !== "admin"
  ) {
    return NextResponse.json(
      { error: "forbidden_attentes_participant" },
      { status: 403 }
    );
  }
  if (
    parsed.data.attentes_manager !== undefined &&
    role !== "manager" &&
    role !== "admin"
  ) {
    return NextResponse.json(
      { error: "forbidden_attentes_manager" },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tandem_documents")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("tandem_pair_id", pairId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ document: data });
}
