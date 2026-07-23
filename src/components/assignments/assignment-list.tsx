import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/metric-card";
import { formatDateTime } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "muted" | "success" | "warning" | "outline" | "destructive"> = {
  not_started: "muted", submitted: "outline", late: "warning", under_review: "outline",
  graded: "success", resubmission_requested: "destructive",
};

export async function AssignmentList({ subjectId }: { subjectId?: string }) {
  const user = await requireUser();
  const supabase = await createClient();
  const isStaff = ["faculty", "dept_admin", "super_admin"].includes(user.role);

  let query = supabase.from("assignments").select("id, title, due_at, max_marks, subjects:subject_id(name, code)").order("due_at", { ascending: true }).limit(50);
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data: assignments } = await query;

  if (!assignments || assignments.length === 0) {
    return <EmptyState icon={ClipboardList} title="No assignments yet" description={isStaff ? "Create an assignment to get started." : "Assignments will appear here once posted."} />;
  }

  let statusByAssignment: Record<string, string> = {};
  if (!isStaff) {
    const { data: submissions } = await supabase.from("assignment_submissions").select("assignment_id, status").eq("student_id", user.id);
    statusByAssignment = Object.fromEntries((submissions ?? []).map((s) => [s.assignment_id, s.status]));
  }

  return (
    <div className="space-y-3">
      {assignments.map((a) => (
        <Link key={a.id} href={`/assignments/${a.id}`}>
          <Card className="transition-colors hover:border-primary/50">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-foreground">{a.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {!subjectId && <span>{(a.subjects as unknown as { code: string } | null)?.code}</span>}
                  <span>Due {formatDateTime(a.due_at)}</span>
                  <span>{a.max_marks} marks</span>
                </div>
              </div>
              {!isStaff && <Badge variant={STATUS_VARIANT[statusByAssignment[a.id] ?? "not_started"]}>{(statusByAssignment[a.id] ?? "not_started").replace("_", " ")}</Badge>}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
