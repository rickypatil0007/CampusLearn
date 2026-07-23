import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/metric-card";
import { NewSubjectDialog } from "./new-subject-dialog";
import { DeleteSubjectButton } from "./delete-subject-button";

export const metadata: Metadata = { title: "Subjects" };

export default async function AdminSubjectsPage() {
  const supabase = await createClient();
  const [{ data: subjects }, { data: departments }, { data: semesters }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, code, credits, department_id, departments:department_id(name), semesters:semester_id(name, number)")
      .is("deleted_at", null)
      .order("code"),
    supabase.from("departments").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("semesters").select("id, name, number, programme_id, programmes:programme_id(name, department_id)").order("number"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Subjects</h1>
          <p className="text-sm text-muted-foreground">Manage the subject catalog across departments and semesters.</p>
        </div>
        <NewSubjectDialog departments={departments ?? []} semesters={(semesters ?? []) as never} />
      </div>
      <Card>
        <CardHeader><CardTitle>All subjects</CardTitle></CardHeader>
        <CardContent>
          {subjects && subjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Semester</TableHead><TableHead>Credits</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell><span className="font-mono-label text-primary">{s.code}</span></TableCell>
                    <TableCell className="font-medium text-foreground"><Link href={`/subjects/${s.id}`} className="hover:underline">{s.name}</Link></TableCell>
                    <TableCell className="text-muted-foreground">{(s.departments as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{(s.semesters as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.credits}</TableCell>
                    <TableCell className="text-right"><DeleteSubjectButton id={s.id} name={s.name} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={BookOpen} title="No subjects yet" description="Add the first subject to a department and semester." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
