import { createClient } from "@/lib/supabase/server";
import { SessionForm } from "@/components/admin/SessionForm";

export default async function NewSessionPage() {
  const supabase = await createClient();
  const { data: organisations } = await supabase
    .from("organisations")
    .select("id, display_name")
    .eq("is_active", true)
    .order("display_name");

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Nouvelle session</h1>
        <p className="text-muted-foreground text-sm">
          La session commence en brouillon. Tu pourras l&apos;activer après avoir rattaché
          des participants, managers et animateurs.
        </p>
      </header>
      <div className="max-w-2xl">
        <SessionForm mode="create" organisations={organisations ?? []} />
      </div>
    </div>
  );
}
