import type { Metadata } from "next";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/metric-card";

export const metadata: Metadata = { title: "Academic Sessions" };

export default async function AcademicSessionsPage() {
  const supabase = await createClient();
  // academic_years has no deleted_at column, and start_date/end_date are
  // nullable since migration 0014 (a session can be created before its
  // exact dates are finalized) -- order by label instead, which is always
  // present, and guard the date rendering below.
  const { data: sessions } = await supabase
    .from("academic_years")
    .select("*")
    .order("label", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Academic Sessions</h1>
          <p className="text-sm text-muted-foreground">Manage academic years and sessions.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>All sessions</CardTitle></CardHeader>
        <CardContent>
          {sessions && sessions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Current</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-foreground">{s.label}</TableCell>
                    <TableCell>{s.start_date ? new Date(s.start_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>{s.end_date ? new Date(s.end_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>{s.is_current ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Calendar} title="No sessions yet" description="No academic sessions have been seeded." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
