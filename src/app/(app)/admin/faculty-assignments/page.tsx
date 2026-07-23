import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/metric-card";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Faculty Teaching Assignments" };

export default async function FacultyAssignmentsPage() {
  await requirePermission("faculty.manage");
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("faculty_teaching_assignments")
    .select(`
      id, is_active, assigned_at, revoked_at,
      profiles:faculty_id(id, full_name, email),
      subjects:subject_id(name, code),
      departments:department_id(name),
      divisions:division_id(name),
      semesters:semester_id(name)
    `)
    .order("assigned_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Faculty Teaching Assignments</h1>
        <p className="text-sm text-muted-foreground">All active and historical class-scoped teaching assignments across the institution.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Assignments</CardTitle></CardHeader>
        <CardContent>
          {assignments && assignments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Faculty</TableHead><TableHead>Subject</TableHead><TableHead>Department</TableHead><TableHead>Semester</TableHead><TableHead>Division</TableHead><TableHead>Assigned</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => {
                  const faculty = a.profiles as unknown as { id: string; full_name: string } | null;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-foreground">
                        {faculty ? <Link href={`/admin/faculty/${faculty.id}`} className="hover:underline">{faculty.full_name}</Link> : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{(a.subjects as unknown as { code: string; name: string } | null)?.code}</TableCell>
                      <TableCell className="text-muted-foreground">{(a.departments as unknown as { name: string } | null)?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{(a.semesters as unknown as { name: string } | null)?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{(a.divisions as unknown as { name: string } | null)?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(a.assigned_at)}</TableCell>
                      <TableCell className="text-muted-foreground">{a.is_active ? "Active" : `Revoked${a.revoked_at ? " " + formatDate(a.revoked_at) : ""}`}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={ClipboardList} title="No teaching assignments yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
