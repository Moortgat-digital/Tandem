import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ROOT_PUBLIC_PATHS = new Set(["/login", "/auth/callback", "/reset-password"]);
const TENANT_PUBLIC_SEGMENTS = new Set(["login", "auth", "reset-password"]);

/**
 * Middleware : rafraîchit la session Supabase et applique le routage par rôle.
 *
 * Règles :
 *  - Tenant slug (/[slug]/...) = espace participant/manager
 *  - Racine (/dashboard, /admin/...) = espace admin/animateur
 *  - Redirections par rôle si l'utilisateur essaie d'accéder à un espace auquel il n'a pas droit
 *  - Résolution tenant : le slug est injecté dans le header `x-tandem-tenant-slug`
 *    pour être consommé par les layouts.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Assets & API publiques : on laisse passer.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/public")
  ) {
    return NextResponse.next();
  }

  const { response, supabase, user } = await updateSession(request);

  const segments = pathname.split("/").filter(Boolean);
  const maybeSlug = segments[0];
  const isTenantRoute =
    maybeSlug !== undefined &&
    maybeSlug !== "api" &&
    maybeSlug !== "auth" &&
    !ROOT_PUBLIC_PATHS.has(pathname);

  // Pages publiques (login, callback) : pas de guard.
  if (ROOT_PUBLIC_PATHS.has(pathname)) {
    return response;
  }
  if (
    isTenantRoute &&
    segments[1] !== undefined &&
    TENANT_PUBLIC_SEGMENTS.has(segments[1])
  ) {
    return response;
  }

  // Endpoints API auth : laisser passer, la route gère elle-même.
  if (pathname.startsWith("/api/auth")) {
    return response;
  }

  // Non authentifié → login approprié.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = isTenantRoute && maybeSlug ? `/${maybeSlug}/login` : "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Récupère le rôle du profil.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "inactive");
    return NextResponse.redirect(url);
  }

  const isRootRole = profile.role === "admin" || profile.role === "animateur";

  // Rôle racine essayant d'entrer dans un espace tenant : on renvoie au dashboard racine.
  if (isTenantRoute && isRootRole) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Participant/manager essayant d'entrer dans l'espace racine : renvoi sur son tenant.
  if (!isTenantRoute && !isRootRole && profile.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("slug")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    if (tenant) {
      const url = request.nextUrl.clone();
      url.pathname = `/${tenant.slug}/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  // Tenant route : vérifie que le slug correspond bien au tenant de l'utilisateur.
  if (isTenantRoute && !isRootRole && profile.tenant_id && maybeSlug) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, slug")
      .eq("slug", maybeSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (!tenant) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "tenant_not_found");
      return NextResponse.redirect(url);
    }
    if (tenant.id !== profile.tenant_id) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "tenant_mismatch");
      return NextResponse.redirect(url);
    }
    response.headers.set("x-tandem-tenant-slug", tenant.slug);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
