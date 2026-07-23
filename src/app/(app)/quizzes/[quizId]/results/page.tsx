import { notFound } from "next/navigation";
import { requireUserOrRedirect, UnauthorizedError } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default async function QuizResultsPage({
  params, searchParams,
}: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { quizId } = await params;
  const { attempt: attemptId } = await searchParams;
  const user = await requireUserOrRedirect();
  const supabase = await createClient();

  let query = supabase.from("quiz_attempts").select("id, student_id, submitted_at, time_taken_seconds, attempt_number").eq("quiz_id", quizId);
  query = attemptId ? query.eq("id", attemptId) : query.eq("student_id", user.id).order("attempt_number", { ascending: false }).limit(1);
  const { data: attempt } = await query.maybeSingle();

  if (!attempt) notFound();
  const isOwner = attempt.student_id === user.id;
  const isStaff = ["faculty", "dept_admin", "super_admin"].includes(user.role);
  if (!isOwner && !isStaff) throw new UnauthorizedError();

  const { data: result } = await supabase.from("quiz_results").select("*").eq("attempt_id", attempt.id).maybeSingle();
  const { data: quiz } = await supabase.from("quizzes").select("title").eq("id", quizId).single();

  if (!attempt.submitted_at || !result) {
    return (
      <div className="max-w-xl">
        <Card><CardContent className="p-6 text-sm text-muted-foreground">This attempt hasn&apos;t been submitted yet.</CardContent></Card>
      </div>
    );
  }

  const percentage = result.total_marks > 0 ? Math.round((result.marks_obtained / result.total_marks) * 100) : 0;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{quiz?.title} — Result</h1>
        <p className="text-sm text-muted-foreground">Attempt {attempt.attempt_number}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Score</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-semibold text-primary">{result.marks_obtained} / {result.total_marks}</p>
            {result.passed !== null && <Badge variant={result.passed ? "success" : "destructive"}>{result.passed ? "Passed" : "Not passed"}</Badge>}
          </div>
          <Progress value={percentage} />
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <span>Accuracy: {result.accuracy?.toFixed(1)}%</span>
            <span>Time taken: {attempt.time_taken_seconds ? `${Math.round(attempt.time_taken_seconds / 60)} min` : "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
