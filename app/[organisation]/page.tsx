import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/organisation";

/**
 * Index d'une organisation : redirige vers son login ou son dashboard.
 * Évite les 404 quand quelqu'un tape juste `/[slug]` sans suffixe.
 */
export default async function OrganisationIndexPage({
  params,
}: {
  params: Promise<{ organisation: string }>;
}) {
  const { organisation: slug } = await params;
  const organisation = await getOrganisationBySlug(slug);
  if (!organisation) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${slug}/login`);
  }
  redirect(`/${slug}/dashboard`);
}
