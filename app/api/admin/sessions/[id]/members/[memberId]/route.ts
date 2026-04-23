import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { memberId } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("session_members").delete().eq("id", memberId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
