import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

const SlugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide (a-z, 0-9, -)");

const CreateOrganisationSchema = z.object({
  display_name: z.string().min(1).max(200),
  slug: SlugSchema,
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur HEX invalide")
    .optional(),
  logo_url: z.string().url().nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = CreateOrganisationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organisations")
    .insert({
      display_name: parsed.data.display_name,
      slug: parsed.data.slug,
      primary_color: parsed.data.primary_color ?? "#1B3A6B",
      logo_url: parsed.data.logo_url ?? null,
      contact_email: parsed.data.contact_email ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ce slug est déjà utilisé" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ organisation: data }, { status: 201 });
}
