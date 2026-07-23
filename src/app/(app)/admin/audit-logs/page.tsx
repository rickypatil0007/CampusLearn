import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/metric-card";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, target_table, target_id, metadata, created_at, actor_id, profiles:actor_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Sensitive actions: role changes, suspensions, approvals, grade changes, publications.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(log.created_at)}</TableCell>
                    <TableCell className="text-foreground">{(log.profiles as unknown as { full_name: string } | null)?.full_name ?? "System"}</TableCell>
                    <TableCell><span className="font-mono-label text-primary">{log.action.replace(/_/g, " ")}</span></TableCell>
                    <TableCell className="text-muted-foreground">{log.target_table ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={ScrollText} title="No audit events recorded yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
