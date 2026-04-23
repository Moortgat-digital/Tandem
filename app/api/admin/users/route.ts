import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

const CreateUserSchema = z
  .object({
    email: z.string().email(),
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    role: z.enum(["admin", "animateur", "participant", "manager"]),
    organisation_id: z.string().uuid().nullable().optional(),
    password: z.string().min(8).max(128).optional(),
    send_invitation: z.boolean().optional().default(false),
  })
  .superRefine((v, ctx) => {
    const root = v.role === "admin" || v.role === "animateur";
    if (root && v.organisation_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Un admin ou animateur ne doit pas être rattaché à une organisation",
        path: ["organisation_id"],
      });
    }
    if (!root && !v.organisation_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Une organisation est requise pour ce rôle",
        path: ["organisation_id"],
      });
    }
  });

function generatePassword(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const admin = createAdminClient();

  const password = input.password ?? generatePassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "Création auth échouée" },
      { status: 500 }
    );
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    email: input.email,
    first_name: input.first_name,
    last_name: input.last_name,
    role: input.role,
    organisation_id: input.organisation_id ?? null,
    is_active: true,
    invitation_sent: false,
  });

  if (profileErr) {
    // Rollback auth si le profil n'a pas pu être créé.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      user: { id: created.user.id, email: input.email },
      temporary_password: input.password ? undefined : password,
    },
    { status: 201 }
  );
}
