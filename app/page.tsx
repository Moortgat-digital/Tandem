import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">Tandem by Moortgat</h1>
      <p className="text-muted-foreground max-w-lg text-center">
        Suivi collaboratif de formation N / N+1. Connectez-vous via le lien
        envoyé par votre administrateur.
      </p>
      <Link
        href="/login"
        className="bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm font-medium shadow-sm hover:opacity-90"
      >
        Accès administrateur / animateur
      </Link>
    </main>
  );
}
