import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { OrganisationRowActions } from "@/components/admin/OrganisationRowActions";

export default async function OrganisationsListPage() {
  const supabase = await createClient();
  const { data: organisations } = await supabase
    .from("organisations")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = organisations ?? [];

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Organisations</h1>
          <p className="text-muted-foreground text-sm">
            Espaces clients avec slug URL, logo et couleur primaire (marque blanche).
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/organisations/new">
            <Plus className="h-4 w-4" />
            Nouvelle organisation
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">Aucune organisation pour le moment.</p>
          <Button asChild className="mt-4">
            <Link href="/admin/organisations/new">
              <Plus className="h-4 w-4" />
              Créer la première
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Slug URL</TableHead>
                <TableHead>Couleur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.display_name}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/{org.slug}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded border"
                        style={{ backgroundColor: org.primary_color ?? "#1B3A6B" }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {org.primary_color ?? "#1B3A6B"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {org.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Archivée</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <OrganisationRowActions organisation={org} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
