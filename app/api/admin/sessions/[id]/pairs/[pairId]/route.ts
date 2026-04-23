import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; pairId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { pairId } = await params;
  const admin = createAdminClient();
  // tandem_documents and entries cascade via FK ON DELETE CASCADE
  const { error } = await admin.from("tandem_pairs").delete().eq("id", pairId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
