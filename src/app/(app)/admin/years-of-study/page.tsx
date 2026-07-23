import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/metric-card";

export const metadata: Metadata = { title: "Years of Study" };

export default async function YearsOfStudyPage() {
  const supabase = await createClient();
  // years_of_study has no deleted_at column.
  const { data: years } = await supabase
    .from("years_of_study")
    .select("*")
    .order("level", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Years of Study</h1>
          <p className="text-sm text-muted-foreground">Manage years of study.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>All Years of Study</CardTitle></CardHeader>
        <CardContent>
          {years && years.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((y) => (
                  <TableRow key={y.id}>
                    <TableCell className="font-medium text-foreground">{y.level}</TableCell>
                    <TableCell>{y.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Layers} title="No years yet" description="No years of study have been seeded." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
