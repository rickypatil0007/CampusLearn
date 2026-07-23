import type { Metadata } from "next";
import { Users, Building2, FileText, Database as DatabaseIcon, Cpu, ShieldAlert, UserPlus, ScrollText, BookOpen, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MetricCard, EmptyState } from "@/components/dashboard/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatBytes, daysAgoIso } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalUsers }, { count: activeStudents }, { count: activeFaculty },
    { count: totalDepartments }, { count: totalResources }, { count: pendingApprovals },
    { count: suspendedAccounts }, { data: recentAudit }, { data: usageLogs },
    { count: totalSubjects }, { count: totalQuizzes }, { count: recentInvitations },
    { data: departments },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["student", "class_rep"]).eq("is_suspended", false),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "faculty").eq("is_suspended", false),
    supabase.from("departments").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("resources").select("id", { count: "exact", head: true }),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", true),
    supabase.from("audit_logs").select("id, action, created_at, actor_id").order("created_at", { ascending: false }).limit(6),
    supabase.from("ai_usage_logs").select("input_tokens, output_tokens, estimated_cost_usd"),
    supabase.from("subjects").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("quizzes").select("id", { count: "exact", head: true }),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }).eq("action", "faculty_invite").gte("created_at", daysAgoIso(30)),
    supabase.from("departments").select("id, name").is("deleted_at", null).order("name"),
  ]);

  const totalStorageEstimate = await supabase.from("resources").select("file_size_bytes");
  const storageUsed = (totalStorageEstimate.data ?? []).reduce((sum, r) => sum + (r.file_size_bytes ?? 0), 0);
  const aiCost = (usageLogs ?? []).reduce((sum, l) => sum + Number(l.estimated_cost_usd ?? 0), 0);
  const aiRequests = usageLogs?.length ?? 0;

  const { data: studentCountsRaw } = await supabase.from("profiles").select("department_id").in("role", ["student", "class_rep"]).eq("is_suspended", false);
  const studentCountByDept = new Map<string, number>();
  for (const row of studentCountsRaw ?? []) {
    if (!row.department_id) continue;
    studentCountByDept.set(row.department_id, (studentCountByDept.get(row.department_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">Institution-wide metrics across CampusLearn.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total Users" value={totalUsers ?? 0} icon={Users} accent />
        <MetricCard label="Active Students" value={activeStudents ?? 0} icon={Users} />
        <MetricCard label="Active Faculty" value={activeFaculty ?? 0} icon={Users} />
        <MetricCard label="Departments" value={totalDepartments ?? 0} icon={Building2} />
        <MetricCard label="Total Subjects" value={totalSubjects ?? 0} icon={BookOpen} />
        <MetricCard label="Total Notes" value={totalResources ?? 0} icon={FileText} />
        <MetricCard label="Total Quizzes" value={totalQuizzes ?? 0} icon={ListChecks} />
        <MetricCard label="Storage Used" value={formatBytes(storageUsed)} icon={DatabaseIcon} />
        <MetricCard label="AI Requests Logged" value={aiRequests} icon={Cpu} trend={aiCost > 0 ? { value: `$${aiCost.toFixed(4)} est. cost` } : undefined} />
        <MetricCard label="Suspended Accounts" value={suspendedAccounts ?? 0} icon={ShieldAlert} />
        <MetricCard label="Faculty Invited (30d)" value={recentInvitations ?? 0} icon={UserPlus} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pending Resource Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingApprovals && pendingApprovals > 0 ? (
              <p className="text-sm text-foreground">{pendingApprovals} resource submission(s) awaiting faculty review.</p>
            ) : (
              <EmptyState icon={UserPlus} title="Nothing pending" description="All resource submissions have been reviewed." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent Audit Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAudit && recentAudit.length > 0 ? (
              recentAudit.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{log.action.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
                </div>
              ))
            ) : (
              <EmptyState icon={ScrollText} title="No audit events yet" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Students by Department</CardTitle></CardHeader>
        <CardContent>
          {departments && departments.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Department</TableHead><TableHead className="text-right">Active Students</TableHead></TableRow></TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-foreground">{d.name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{studentCountByDept.get(d.id) ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Building2} title="No departments yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
