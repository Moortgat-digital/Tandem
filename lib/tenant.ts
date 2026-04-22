import { createClient } from "@/lib/supabase/server";
import type { Tenant } from "@/types/tandem";

/**
 * Résout un tenant à partir de son slug URL.
 * Renvoie null si inconnu ou désactivé.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
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
