import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Organisation } from "@/types/tandem";

export { normalizeSlug } from "@/lib/slug";

/**
 * Résout une organisation à partir de son slug URL.
 * Renvoie null si inconnue ou désactivée.
 */
export async function getOrganisationBySlug(slug: string): Promise<Organisation | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organisations")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}
