import { createClient } from "@/lib/supabase/server";
import type { Organisation } from "@/types/tandem";

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

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
