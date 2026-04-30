import { notFound } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/organisation";
import { LoginForm } from "@/components/auth/LoginForm";
import { TandemLogo } from "@/components/brand/TandemLogo";

export default async function OrganisationLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ organisation: string }>;
  searchParams: Promise<{ error?: string; magic_sent?: string; next?: string }>;
}) {
  const { organisation: slug } = await params;
  const search = await searchParams;
  const organisation = await getOrganisationBySlug(slug);
  if (!organisation) notFound();

  const loginPath = `/${organisation.slug}/login`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <TandemLogo size="lg" />
          {organisation.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organisation.logo_url}
              alt={organisation.display_name}
              className="mx-auto h-10 w-auto"
            />
          ) : null}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{organisation.display_name}</h1>
            <p className="text-muted-foreground text-sm">
              Tandem by Moortgat — espace participant / manager
            </p>
          </div>
        </div>
        <LoginForm
          redirectTo={search.next ?? `/${organisation.slug}/dashboard`}
          loginPath={loginPath}
          error={search.error}
          magicSent={search.magic_sent === "1"}
        />
      </div>
    </main>
  );
}
