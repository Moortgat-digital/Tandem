import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function TenantLoginPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.display_name}
              className="mx-auto h-12 w-auto"
            />
          ) : null}
          <h1 className="text-2xl font-semibold">{tenant.display_name}</h1>
          <p className="text-muted-foreground text-sm">
            Tandem by Moortgat — espace participant / manager
          </p>
        </div>
        <LoginForm redirectTo={`/${tenant.slug}/dashboard`} />
      </div>
    </main>
  );
}
