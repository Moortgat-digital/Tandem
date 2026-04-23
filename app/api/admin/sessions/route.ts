import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

const CreateSessionSchema = z.object({
  name: z.string().min(1).max(200),
  organisation_id: z.string().uuid(),
  nb_priorites_max: z.number().int().min(1).max(5).optional(),
  allow_multiple_rdv_inter: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sessions")
    .insert({
      name: parsed.data.name,
      organisation_id: parsed.data.organisation_id,
      nb_priorites_max: parsed.data.nb_priorites_max ?? 5,
      allow_multiple_rdv_inter: parsed.data.allow_multiple_rdv_inter ?? true,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ session: data }, { status: 201 });
}
