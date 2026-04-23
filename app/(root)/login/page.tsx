import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Connexion — Tandem by Moortgat" };

export default async function RootLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; magic_sent?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Tandem by Moortgat</h1>
          <p className="text-muted-foreground text-sm">
            Espace administrateur / animateur
          </p>
        </div>
        <LoginForm
          redirectTo={params.next ?? "/dashboard"}
          loginPath="/login"
          error={params.error}
          magicSent={params.magic_sent === "1"}
        />
      </div>
    </main>
  );
}
