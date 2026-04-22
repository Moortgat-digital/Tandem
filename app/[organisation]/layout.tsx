import { notFound } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/organisation";
import { OrganisationProvider } from "@/components/layout/OrganisationProvider";

export default async function OrganisationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organisation: string }>;
}) {
  const { organisation: slug } = await params;
  const organisation = await getOrganisationBySlug(slug);
  if (!organisation) notFound();

  return (
    <OrganisationProvider organisation={organisation}>
      <div
        className="min-h-screen"
        style={
          {
            "--organisation-primary": organisation.primary_color ?? "#1B3A6B",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </OrganisationProvider>
  );
}
