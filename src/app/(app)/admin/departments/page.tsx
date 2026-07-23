import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/metric-card";
import { NewDepartmentDialog } from "./new-department-dialog";
import { DeleteDepartmentButton } from "./delete-department-button";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, code, description")
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground">Manage academic departments across the institution.</p>
        </div>
        <NewDepartmentDialog />
      </div>

      <Card>
        <CardHeader><CardTitle>All departments</CardTitle></CardHeader>
        <CardContent>
          {departments && departments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-foreground">{d.name}</TableCell>
                    <TableCell><span className="font-mono-label text-primary">{d.code}</span></TableCell>
                    <TableCell className="text-muted-foreground">{d.description || "—"}</TableCell>
                    <TableCell className="text-right"><DeleteDepartmentButton id={d.id} name={d.name} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Building2} title="No departments yet" description="Create the first department to begin building the academic structure." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
