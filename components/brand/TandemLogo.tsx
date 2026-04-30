import { cn } from "@/lib/utils";

/**
 * Logo Tandem — un cercle corail Moortgat avec deux silhouettes en
 * binôme, dans l'esprit de la slide Recommandation.
 *
 * Utilisation :
 *   <TandemLogo size="md" />              → icône seule
 *   <TandemLogo size="md" withWordmark /> → icône + mot "Tandem"
 */
export function TandemLogo({
  size = "md",
  withWordmark = false,
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  withWordmark?: boolean;
  className?: string;
}) {
  const px = sizePx(size);
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <TandemMark px={px} />
      {withWordmark ? (
        <span
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: px * 0.55, lineHeight: 1 }}
        >
          Tandem
        </span>
      ) : null}
    </span>
  );
}

function TandemMark({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Tandem"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="32" r="32" fill="hsl(var(--tandem-coral))" />
      {/* Personne de gauche */}
      <circle cx="24" cy="26" r="6" fill="#ffffff" />
      <path
        d="M12 50 a12 12 0 0 1 24 0 v2 H12 z"
        fill="#ffffff"
      />
      {/* Personne de droite (légèrement décalée) */}
      <circle cx="42" cy="24" r="6.5" fill="#ffffff" />
      <path
        d="M28 50 a14 14 0 0 1 28 0 v2 H28 z"
        fill="#ffffff"
      />
    </svg>
  );
}

function sizePx(size: "sm" | "md" | "lg" | "xl"): number {
  switch (size) {
    case "sm":
      return 28;
    case "md":
      return 40;
    case "lg":
      return 56;
    case "xl":
      return 80;
  }
}
