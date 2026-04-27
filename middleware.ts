import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ROOT_PUBLIC_PATHS = new Set(["/", "/login", "/auth/callback", "/reset-password"]);
const ROOT_SEGMENTS = new Set([
  "login",
  "dashboard",
  "admin",
  "animateur",
  "reset-password",
]);
const ORGANISATION_PUBLIC_SEGMENTS = new Set(["login", "auth", "reset-password"]);

/**
 * Middleware : rafraîchit la session Supabase et applique le routage par rôle.
 *
 * Règles :
 *  - Organisation slug (/[slug]/...) = espace participant/manager
 *  - Racine (/dashboard, /admin/...) = espace admin/animateur
 *  - Redirections par rôle si l'utilisateur essaie d'accéder à un espace auquel il n'a pas droit
 *  - Le slug d'organisation résolu est injecté dans `x-tandem-organisation-slug`
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
  const isOrganisationRoute =
    maybeSlug !== undefined &&
    maybeSlug !== "api" &&
    maybeSlug !== "auth" &&
    !ROOT_SEGMENTS.has(maybeSlug) &&
    !ROOT_PUBLIC_PATHS.has(pathname);

  // Pages publiques (login, callback) : pas de guard.
  if (ROOT_PUBLIC_PATHS.has(pathname)) {
    return response;
  }
  if (
    isOrganisationRoute &&
    segments[1] !== undefined &&
    ORGANISATION_PUBLIC_SEGMENTS.has(segments[1])
  ) {
    return response;
  }

  // Endpoints API : la route gère elle-même l'authentification et les
  // permissions (requireAdmin / requireTandemPairAccess). Le middleware ne
  // doit PAS appliquer le routage tenant ici, sinon un participant qui POST
  // sur /api/tandems/[pairId]/* serait redirigé vers /[slug]/dashboard.
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // Non authentifié → login approprié.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = isOrganisationRoute && maybeSlug ? `/${maybeSlug}/login` : "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Récupère le rôle du profil.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organisation_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "inactive");
    return NextResponse.redirect(url);
  }

  const isRootRole = profile.role === "admin" || profile.role === "animateur";

  // Rôle racine essayant d'entrer dans un espace organisation : renvoi au dashboard racine.
  if (isOrganisationRoute && isRootRole) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Participant/manager essayant d'entrer dans l'espace racine : renvoi sur son organisation.
  if (!isOrganisationRoute && !isRootRole && profile.organisation_id) {
    const { data: organisation } = await supabase
      .from("organisations")
      .select("slug")
      .eq("id", profile.organisation_id)
      .maybeSingle();
    if (organisation) {
      const url = request.nextUrl.clone();
      url.pathname = `/${organisation.slug}/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  // Organisation route : vérifie que le slug correspond bien à l'organisation de l'utilisateur.
  if (isOrganisationRoute && !isRootRole && profile.organisation_id && maybeSlug) {
    const { data: organisation } = await supabase
      .from("organisations")
      .select("id, slug")
      .eq("slug", maybeSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (!organisation) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "organisation_not_found");
      return NextResponse.redirect(url);
    }
    if (organisation.id !== profile.organisation_id) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "organisation_mismatch");
      return NextResponse.redirect(url);
    }
    response.headers.set("x-tandem-organisation-slug", organisation.slug);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
