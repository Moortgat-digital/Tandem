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

  // Deux flux possibles :
  //  1. Mot de passe explicite fourni → on crée le compte directement (cas
  //     spécifique : compte de test, démo, ou import manuel).
  //  2. Pas de mot de passe → on envoie une invitation par email avec un
  //     magic link, l'utilisateur définit son propre mot de passe (défaut).
  let userId: string;
  let invitationSent = false;

  if (input.password) {
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });
    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Création auth échouée" },
        { status: 500 }
      );
    }
    userId = created.user.id;
  } else {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(input.email, {
        redirectTo: `${appUrl}/auth/callback`,
      });
    if (inviteErr || !invited.user) {
      return NextResponse.json(
        { error: inviteErr?.message ?? "Envoi d'invitation échoué" },
        { status: 500 }
      );
    }
    userId = invited.user.id;
    invitationSent = true;
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: userId,
    email: input.email,
    first_name: input.first_name,
    last_name: input.last_name,
    role: input.role,
    organisation_id: input.organisation_id ?? null,
    is_active: true,
    invitation_sent: invitationSent,
  });

  if (profileErr) {
    // Rollback auth si le profil n'a pas pu être créé.
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      user: { id: userId, email: input.email },
      invitation_sent: invitationSent,
    },
    { status: 201 }
  );
}
