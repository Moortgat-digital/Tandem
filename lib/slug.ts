/**
 * Normalise un libellé en slug URL valide (a-z, 0-9, tirets).
 * Utilisable côté client ET serveur (pas de dépendances runtime).
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
