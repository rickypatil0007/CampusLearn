import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/metric-card";
import { CalendarClock } from "lucide-react";
import { StudyPlanForm } from "./study-plan-form";
import { TaskItem } from "./task-item";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Study Planner" };

export default async function StudyPlannerPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: subjects }, { data: plan }] = await Promise.all([
    supabase.from("subject_enrollments").select("subjects(id, name)").eq("student_id", user.id),
    supabase.from("study_plans").select("id, title, exam_date, study_plan_tasks(id, title, scheduled_date, duration_minutes, is_complete, task_type)").eq("student_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const subjectOptions = (subjects ?? []).map((s) => (s as unknown as { subjects: { id: string; name: string } }).subjects).filter(Boolean);

  const tasksByDate = new Map<string, { id: string; title: string; duration_minutes: number; is_complete: boolean; task_type: string }[]>();
  for (const t of plan?.study_plan_tasks ?? []) {
    const list = tasksByDate.get(t.scheduled_date) ?? [];
    list.push(t);
    tasksByDate.set(t.scheduled_date, list);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AI Study Planner</h1>
        <p className="text-sm text-muted-foreground">Generate a personalized daily plan leading up to your exam.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a plan</CardTitle>
          <CardDescription>Requires an administrator to configure ANTHROPIC_API_KEY. Generating a new plan replaces the display below.</CardDescription>
        </CardHeader>
        <CardContent><StudyPlanForm subjects={subjectOptions} /></CardContent>
      </Card>

      {plan && tasksByDate.size > 0 ? (
        <Card>
          <CardHeader><CardTitle>{plan.title}</CardTitle><CardDescription>Exam: {plan.exam_date ? formatDate(plan.exam_date) : "—"}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {Array.from(tasksByDate.entries()).map(([date, tasks]) => (
              <div key={date}>
                <p className="font-mono-label text-muted-foreground">{formatDate(date)}</p>
                <div className="mt-1 space-y-1">
                  {tasks.map((t) => <TaskItem key={t.id} task={t} />)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyState icon={CalendarClock} title="No study plan yet" description="Create one above to see your day-by-day schedule here." />
      )}
    </div>
  );
}
