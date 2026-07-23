import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/metric-card";

export const metadata: Metadata = { title: "Faculty Management" };

export default async function AdminFacultyPage() {
  await requirePermission("faculty.manage");
  const supabase = await createClient();

  const [{ data: faculty }, { data: assignmentCounts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, is_suspended, department_id, departments:department_id(name)")
      .eq("role", "faculty")
      .order("full_name"),
    supabase.from("faculty_teaching_assignments").select("faculty_id").eq("is_active", true),
  ]);

  const countByFaculty = new Map<string, number>();
  for (const row of assignmentCounts ?? []) {
    countByFaculty.set(row.faculty_id, (countByFaculty.get(row.faculty_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Faculty Management</h1>
          <p className="text-sm text-muted-foreground">Invite, edit, and manage teaching assignments for Faculty accounts.</p>
        </div>
        <Button asChild size="sm"><Link href="/admin/faculty/new">Invite Faculty</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All Faculty ({faculty?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {faculty && faculty.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Department</TableHead><TableHead>Active assignments</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {faculty.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium text-foreground">{f.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{f.email}</TableCell>
                    <TableCell className="text-muted-foreground">{(f.departments as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{countByFaculty.get(f.id) ?? 0}</TableCell>
                    <TableCell>{f.is_suspended ? <Badge variant="destructive">Deactivated</Badge> : <Badge variant="outline">Active</Badge>}</TableCell>
                    <TableCell className="text-right"><Link href={`/admin/faculty/${f.id}`} className="text-sm text-primary hover:underline">Manage</Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={GraduationCap} title="No Faculty accounts yet" description="Invite your first Faculty member to get started." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
