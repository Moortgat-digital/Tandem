import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrganisationForm } from "@/components/admin/OrganisationForm";

export default async function EditOrganisationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: organisation } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!organisation) notFound();

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">{organisation.display_name}</h1>
        <p className="text-muted-foreground text-sm">
          Édite les informations de l&apos;organisation.
        </p>
      </header>
      <div className="max-w-2xl">
        <OrganisationForm mode="edit" organisation={organisation} />
      </div>
    </div>
  );
}
