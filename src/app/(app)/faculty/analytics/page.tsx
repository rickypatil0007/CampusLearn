import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, EmptyState } from "@/components/dashboard/metric-card";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = { title: "Class Analytics" };

export default async function FacultyAnalyticsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: subjectLinks } = await supabase.from("subject_faculty").select("subject_id, subjects(id, name)").eq("faculty_id", user.id);
  const subjectIds = (subjectLinks ?? []).map((s) => s.subject_id);

  const { data: quizzes } = subjectIds.length ? await supabase.from("quizzes").select("id, title").in("subject_id", subjectIds) : { data: [] };
  const quizIds = (quizzes ?? []).map((q) => q.id);

  const { data: attempts } = quizIds.length
    ? await supabase.from("quiz_attempts").select("id, quiz_id, quiz_results(accuracy, marks_obtained, total_marks)").in("quiz_id", quizIds).not("submitted_at", "is", null)
    : { data: [] };

  const perQuiz = (quizzes ?? []).map((q) => {
    const relevant = (attempts ?? []).filter((a) => a.quiz_id === q.id);
    const accuracies = relevant.map((a) => (a.quiz_results as unknown as { accuracy: number } | null)?.accuracy).filter((v): v is number => v != null);
    const avg = accuracies.length ? Math.round(accuracies.reduce((s, v) => s + v, 0) / accuracies.length) : null;
    return { title: q.title, attempts: relevant.length, avgAccuracy: avg };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Class Analytics</h1>
        <p className="text-sm text-muted-foreground">Participation and accuracy across your quizzes.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard label="Quizzes" value={quizzes?.length ?? 0} icon={BarChart3} />
        <MetricCard label="Total Attempts" value={attempts?.length ?? 0} />
      </div>

      <Card>
        <CardHeader><CardTitle>Quiz participation &amp; accuracy</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {perQuiz.length > 0 ? perQuiz.map((q, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{q.title}</span>
              <span className="text-muted-foreground">{q.attempts} attempts · {q.avgAccuracy !== null ? `${q.avgAccuracy}% avg` : "no submissions yet"}</span>
            </div>
          )) : <EmptyState title="No quiz data yet" description="Publish a quiz to start seeing class-level analytics." />}
        </CardContent>
      </Card>
    </div>
  );
}
