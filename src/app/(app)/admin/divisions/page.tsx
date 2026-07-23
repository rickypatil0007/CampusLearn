import type { Metadata } from "next";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/metric-card";

export const metadata: Metadata = { title: "Divisions" };

export default async function DivisionsPage() {
  const supabase = await createClient();
  // divisions has no deleted_at column (unlike departments/programmes/
  // subjects) -- the previous .is("deleted_at", null) filter here would
  // fail at query time against a real Postgres project since the column
  // does not exist.
  const { data: divisions } = await supabase
    .from("divisions")
    .select("*, semesters(name, programmes(name))")
    .order("name", { ascending: true })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Divisions</h1>
          <p className="text-sm text-muted-foreground">Manage academic divisions.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>All Divisions</CardTitle></CardHeader>
        <CardContent>
          {divisions && divisions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Programme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divisions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-foreground">{d.name}</TableCell>
                    <TableCell>{(d.semesters as unknown as { name: string } | null)?.name}</TableCell>
                    <TableCell>{(d.semesters as unknown as { programmes: { name: string } | null } | null)?.programmes?.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Users} title="No divisions yet" description="No divisions have been seeded." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
