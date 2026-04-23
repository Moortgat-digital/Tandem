import { OrganisationForm } from "@/components/admin/OrganisationForm";

export default function NewOrganisationPage() {
  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Nouvelle organisation</h1>
        <p className="text-muted-foreground text-sm">
          Crée un nouvel espace client avec son slug URL et sa charte visuelle.
        </p>
      </header>
      <div className="max-w-2xl">
        <OrganisationForm mode="create" />
      </div>
    </div>
  );
}
