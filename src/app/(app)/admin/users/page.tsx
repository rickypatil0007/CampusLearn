import type { Metadata } from "next";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/metric-card";
import { ROLE_LABELS, type Role } from "@/lib/permissions/roles";
import { UserRowActions } from "./user-row-actions";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_suspended, departments:department_id(name)")
    .order("full_name")
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">All CampusLearn accounts. Role changes are audited.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>All users ({users?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Department</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-foreground">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{(u.departments as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{ROLE_LABELS[u.role as Role]}</Badge></TableCell>
                    <TableCell>{u.is_suspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="success">Active</Badge>}</TableCell>
                    <TableCell className="text-right"><UserRowActions userId={u.id} name={u.full_name} isSuspended={u.is_suspended} currentRole={u.role as Role} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Users} title="No users yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
