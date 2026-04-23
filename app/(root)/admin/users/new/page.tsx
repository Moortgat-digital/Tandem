import { createClient } from "@/lib/supabase/server";
import { UserForm } from "@/components/admin/UserForm";

export default async function NewUserPage() {
  const supabase = await createClient();
  const { data: organisations } = await supabase
    .from("organisations")
    .select("id, display_name")
    .eq("is_active", true)
    .order("display_name");

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Nouvel utilisateur</h1>
        <p className="text-muted-foreground text-sm">
          Un mot de passe temporaire sera généré si tu n&apos;en saisis pas.
        </p>
      </header>
      <div className="max-w-2xl">
        <UserForm organisations={organisations ?? []} />
      </div>
    </div>
  );
}
