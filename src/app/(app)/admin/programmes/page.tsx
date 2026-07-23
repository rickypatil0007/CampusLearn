import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/metric-card";
import { NewProgrammeDialog } from "./new-programme-dialog";

export const metadata: Metadata = { title: "Programmes" };

export default async function ProgrammesPage() {
  const supabase = await createClient();
  const [{ data: programmes }, { data: departments }] = await Promise.all([
    supabase.from("programmes").select("id, name, code, duration_years, department_id, departments:department_id(name)").is("deleted_at", null).order("name"),
    supabase.from("departments").select("id, name").is("deleted_at", null).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Programmes</h1>
          <p className="text-sm text-muted-foreground">Degree programmes offered per department.</p>
        </div>
        <NewProgrammeDialog departments={departments ?? []} />
      </div>
      <Card>
        <CardHeader><CardTitle>All programmes</CardTitle></CardHeader>
        <CardContent>
          {programmes && programmes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Department</TableHead><TableHead>Duration</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {programmes.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                    <TableCell><span className="font-mono-label text-primary">{p.code}</span></TableCell>
                    <TableCell className="text-muted-foreground">{(p.departments as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.duration_years} years</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={GraduationCap} title="No programmes yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
