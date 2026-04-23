import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

const Schema = z.object({
  participant_id: z.string().uuid(),
  manager_id: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: sessionId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }
  if (parsed.data.participant_id === parsed.data.manager_id) {
    return NextResponse.json(
      { error: "Participant et manager doivent être deux personnes différentes" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Both must be session members with the right role_in_session
  const { data: members } = await admin
    .from("session_members")
    .select("user_id, role_in_session")
    .eq("session_id", sessionId)
    .in("user_id", [parsed.data.participant_id, parsed.data.manager_id]);

  const hasParticipant = members?.some(
    (m) =>
      m.user_id === parsed.data.participant_id && m.role_in_session === "participant"
  );
  const hasManager = members?.some(
    (m) => m.user_id === parsed.data.manager_id && m.role_in_session === "manager"
  );

  if (!hasParticipant) {
    return NextResponse.json(
      { error: "Le participant n'est pas membre de cette session" },
      { status: 400 }
    );
  }
  if (!hasManager) {
    return NextResponse.json(
      { error: "Le manager n'est pas membre de cette session" },
      { status: 400 }
    );
  }

  // Create the pair + the tandem document at once
  const { data: pair, error: pairErr } = await admin
    .from("tandem_pairs")
    .insert({
      session_id: sessionId,
      participant_id: parsed.data.participant_id,
      manager_id: parsed.data.manager_id,
    })
    .select()
    .single();

  if (pairErr) {
    if (pairErr.code === "23505") {
      return NextResponse.json(
        { error: "Ce participant a déjà un binôme dans cette session" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: pairErr.message }, { status: 500 });
  }

  const { error: docErr } = await admin
    .from("tandem_documents")
    .insert({ tandem_pair_id: pair.id });

  if (docErr) {
    // Rollback the pair if document creation fails
    await admin.from("tandem_pairs").delete().eq("id", pair.id);
    return NextResponse.json({ error: docErr.message }, { status: 500 });
  }

  return NextResponse.json({ pair }, { status: 201 });
}
