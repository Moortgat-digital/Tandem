import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import { TenantProvider } from "@/components/layout/TenantProvider";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  return (
    <TenantProvider tenant={tenant}>
      <div
        className="min-h-screen"
        style={{ "--tenant-primary": tenant.primary_color ?? "#1B3A6B" } as React.CSSProperties}
      >
        {children}
      </div>
    </TenantProvider>
  );
}
