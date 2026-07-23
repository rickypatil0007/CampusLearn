import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/metric-card";
import { InviteStaffForm } from "./invite-staff-form";
import { ROLE_LABELS, type Role } from "@/lib/permissions/roles";

export const metadata: Metadata = { title: "Invitations" };

export default async function InvitationsPage() {
  const supabase = await createClient();
  const [{ data: staff }, { data: departments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, created_at").in("role", ["faculty", "dept_admin"]).order("created_at", { ascending: false }).limit(50),
    supabase.from("departments").select("id, name").is("deleted_at", null).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Invitations</h1>
        <p className="text-sm text-muted-foreground">Faculty and Department Administrator accounts are created here — never through public sign-up.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite staff</CardTitle>
          <CardDescription>
            Creates the account directly with a temporary password (documented as a known limitation — a production
            deployment would send an email invite link instead of a password).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteStaffForm departments={departments ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recently added staff</CardTitle></CardHeader>
        <CardContent>
          {staff && staff.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead></TableRow></TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-foreground">{s.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell><Badge variant="outline">{ROLE_LABELS[s.role as Role]}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={UserPlus} title="No staff invited yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
