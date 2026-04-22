import { notFound } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/organisation";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function OrganisationLoginPage({
  params,
}: {
  params: Promise<{ organisation: string }>;
}) {
  const { organisation: slug } = await params;
  const organisation = await getOrganisationBySlug(slug);
  if (!organisation) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          {organisation.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organisation.logo_url}
              alt={organisation.display_name}
              className="mx-auto h-12 w-auto"
            />
          ) : null}
          <h1 className="text-2xl font-semibold">{organisation.display_name}</h1>
          <p className="text-muted-foreground text-sm">
            Tandem by Moortgat — espace participant / manager
          </p>
        </div>
        <LoginForm redirectTo={`/${organisation.slug}/dashboard`} />
      </div>
    </main>
  );
}
