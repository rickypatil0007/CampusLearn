import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/metric-card";

export const metadata: Metadata = { title: "Semesters" };

export default async function SemestersPage() {
  const supabase = await createClient();
  // semesters has no deleted_at column -- the previous
  // .is("deleted_at", null) filter would fail at query time.
  const { data: semesters } = await supabase
    .from("semesters")
    .select("*, programmes(name)")
    .order("number", { ascending: true })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Semesters</h1>
          <p className="text-sm text-muted-foreground">Manage semesters.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>All Semesters</CardTitle></CardHeader>
        <CardContent>
          {semesters && semesters.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Programme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {semesters.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-foreground">{s.number}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{(s.programmes as unknown as { name: string } | null)?.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={BookOpen} title="No semesters yet" description="No semesters have been seeded." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
