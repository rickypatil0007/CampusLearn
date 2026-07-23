import Link from "next/link";
import { BookOpen, Users, CheckSquare, ClipboardList, ListChecks, Upload, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MetricCard, EmptyState } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export async function FacultyDashboard({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [{ data: subjectLinks }, { data: classAssignments }] = await Promise.all([
    supabase.from("subject_faculty").select("subject_id").eq("faculty_id", userId),
    supabase
      .from("faculty_teaching_assignments")
      .select("department_id, programme_id, academic_year_id, semester_id, division_id")
      .eq("faculty_id", userId)
      .eq("is_active", true),
  ]);
  const subjectIds = (subjectLinks ?? []).map((s) => s.subject_id);
  const distinctClassCount = new Set((classAssignments ?? []).map((c) => `${c.department_id}|${c.programme_id}|${c.academic_year_id}|${c.semester_id}|${c.division_id}`)).size;

  const { data: subjectAssignments } = subjectIds.length
    ? await supabase.from("assignments").select("id").in("subject_id", subjectIds)
    : { data: [] as { id: string }[] };
  const assignmentIds = (subjectAssignments ?? []).map((a) => a.id);

  const { data: subjectQuizzes } = subjectIds.length
    ? await supabase.from("quizzes").select("id, status, created_by").in("subject_id", subjectIds)
    : { data: [] as { id: string; status: string; created_by: string }[] };
  const quizIds = (subjectQuizzes ?? []).map((q) => q.id);
  const pendingQuizzes = (subjectQuizzes ?? []).filter((q) => q.created_by === userId && (q.status === "draft" || q.status === "scheduled")).length;

  const [
    { count: activeStudents }, { count: pendingApprovals },
    { count: assignmentsToGrade }, { data: quizResults }, { count: resourcesUploaded }, { data: pendingSubmissions },
    { data: recentUploads },
  ] = await Promise.all([
    subjectIds.length ? supabase.from("subject_enrollments").select("id", { count: "exact", head: true }).in("subject_id", subjectIds) : Promise.resolve({ count: 0 }),
    subjectIds.length
      ? supabase.from("resources").select("id", { count: "exact", head: true }).eq("approval_status", "pending").in("subject_id", subjectIds)
      : Promise.resolve({ count: 0 }),
    assignmentIds.length
      ? supabase.from("assignment_submissions").select("id", { count: "exact", head: true }).eq("status", "submitted").in("assignment_id", assignmentIds)
      : Promise.resolve({ count: 0 }),
    quizIds.length
      ? (async () => {
          const { data: attempts } = await supabase.from("quiz_attempts").select("id").in("quiz_id", quizIds);
          const attemptIds = (attempts ?? []).map((a) => a.id);
          if (!attemptIds.length) return { data: [] as { accuracy: number | null }[] };
          return supabase.from("quiz_results").select("accuracy").in("attempt_id", attemptIds);
        })()
      : Promise.resolve({ data: [] as { accuracy: number | null }[] }),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("uploaded_by", userId),
    subjectIds.length
      ? supabase.from("resources").select("id, title, profiles:uploaded_by(full_name), created_at").eq("approval_status", "pending").in("subject_id", subjectIds).order("created_at").limit(5)
      : Promise.resolve({ data: [] }),
    supabase.from("resources").select("id, title, created_at, approval_status").eq("uploaded_by", userId).order("created_at", { ascending: false }).limit(5),
  ]);

  const avgQuizScore = quizResults && quizResults.length > 0 ? Math.round(quizResults.reduce((s, r) => s + (r.accuracy ?? 0), 0) / quizResults.length) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Faculty Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your assigned subjects, classes, and pending work.</p>
        </div>
        <Button asChild size="sm"><Link href="/faculty/resources/new"><Upload className="h-4 w-4" /> Quick upload</Link></Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Assigned Subjects" value={subjectIds.length} icon={BookOpen} accent />
        <MetricCard label="Assigned Classes" value={distinctClassCount} icon={LayoutGrid} />
        <MetricCard label="Active Students" value={activeStudents ?? 0} icon={Users} />
        <MetricCard label="Pending Approvals" value={pendingApprovals ?? 0} icon={CheckSquare} />
        <MetricCard label="Assignments to Grade" value={assignmentsToGrade ?? 0} icon={ClipboardList} />
        <MetricCard label="Pending Quizzes" value={pendingQuizzes ?? 0} icon={ListChecks} />
        <MetricCard label="Avg Quiz Score" value={avgQuizScore !== null ? `${avgQuizScore}%` : "—"} icon={ListChecks} />
        <MetricCard label="Total Notes Uploaded" value={resourcesUploaded ?? 0} icon={Upload} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pending CR Uploads</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingSubmissions && pendingSubmissions.length > 0 ? pendingSubmissions.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <Link href="/faculty/approvals" className="text-foreground hover:underline">{r.title}</Link>
                <span className="text-xs text-muted-foreground">{(r.profiles as unknown as { full_name: string } | null)?.full_name} · {formatDate(r.created_at)}</span>
              </div>
            )) : <EmptyState title="Nothing pending" description="All CR submissions have been reviewed." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Your Recent Uploads</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentUploads && recentUploads.length > 0 ? recentUploads.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <Link href={`/resources/${r.id}`} className="text-foreground hover:underline">{r.title}</Link>
                <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
              </div>
            )) : <EmptyState title="No uploads yet" description="Upload your first resource to a class." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
