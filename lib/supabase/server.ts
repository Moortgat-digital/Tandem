import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Client Supabase côté serveur — respecte RLS (clé anon + session cookie).
 * À utiliser dans les Route Handlers, Server Components et Server Actions.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component : ignoré, le middleware rafraîchit la session.
          }
        },
      },
    }
  );
}

/**
 * Client Supabase admin (bypass RLS via service_role).
 * Ne JAMAIS exposer côté client. Utiliser uniquement dans des routes authentifiées
 * où l'on a déjà vérifié le rôle de l'appelant.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
