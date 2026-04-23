import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "muted" | "secondary" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  active: { label: "Active", variant: "success" },
  archived: { label: "Archivée", variant: "muted" },
};

export default async function SessionsListPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, organisation_id, status, nb_priorites_max, created_at")
    .order("created_at", { ascending: false });

  const { data: orgs } = await supabase
    .from("organisations")
    .select("id, display_name");

  const orgsById = new Map((orgs ?? []).map((o) => [o.id, o.display_name]));
  const rows = sessions ?? [];

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Sessions</h1>
          <p className="text-muted-foreground text-sm">
            Parcours de formation avec leurs participants et managers.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/sessions/new">
            <Plus className="h-4 w-4" />
            Nouvelle session
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">Aucune session pour le moment.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Priorités max</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const statusMeta = STATUS_LABEL[s.status ?? "draft"] ?? STATUS_LABEL.draft!;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/sessions/${s.id}`}
                        className="hover:underline"
                      >
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {orgsById.get(s.organisation_id) ?? "—"}
                    </TableCell>
                    <TableCell>{s.nb_priorites_max ?? 5}</TableCell>
                    <TableCell>
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
