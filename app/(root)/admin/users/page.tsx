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
import { UserRowActions } from "@/components/admin/UserRowActions";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  animateur: "Animateur",
  participant: "Participant (N)",
  manager: "Manager (N+1)",
};

export default async function UsersListPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, organisation_id, is_active, created_at")
    .order("created_at", { ascending: false });

  const { data: orgs } = await supabase
    .from("organisations")
    .select("id, display_name");

  const orgsById = new Map((orgs ?? []).map((o) => [o.id, o.display_name]));
  const rows = users ?? [];

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Utilisateurs</h1>
          <p className="text-muted-foreground text-sm">
            Administrateurs, animateurs, participants et managers.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="h-4 w-4" />
            Nouvel utilisateur
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">Aucun utilisateur.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.first_name} {u.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.organisation_id ? (
                      <span className="text-sm">
                        {orgsById.get(u.organisation_id) ?? "—"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Racine</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <Badge variant="success">Actif</Badge>
                    ) : (
                      <Badge variant="muted">Désactivé</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <UserRowActions
                      user={{
                        id: u.id,
                        is_active: u.is_active ?? true,
                      }}
                    />
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
