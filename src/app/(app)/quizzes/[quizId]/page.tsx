import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizDetailPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const user = await requireUserOrRedirect();
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, description, instructions, status, due_at, time_limit_minutes, max_attempts, passing_marks, subjects:subject_id(name)")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz || quiz.status !== "published") notFound();

  const { count: questionCount } = await supabase.from("quiz_questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
  const { data: attempts } = await supabase
    .from("quiz_attempts").select("id, submitted_at, attempt_number").eq("quiz_id", quizId).eq("student_id", user.id).order("attempt_number", { ascending: false });

  const inProgress = attempts?.find((a) => !a.submitted_at);
  const completed = attempts?.filter((a) => a.submitted_at) ?? [];
  const isPastDue = quiz.due_at && new Date(quiz.due_at) < new Date();
  const canAttempt = !isPastDue && (attempts?.length ?? 0) < quiz.max_attempts;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{quiz.title}</h1>
        <p className="text-sm text-muted-foreground">{(quiz.subjects as unknown as { name: string } | null)?.name}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-foreground">{quiz.description}</p>
          {quiz.instructions && <p className="text-muted-foreground">{quiz.instructions}</p>}
          <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
            <span>{questionCount ?? 0} questions</span>
            {quiz.time_limit_minutes && <span>{quiz.time_limit_minutes} minute limit</span>}
            <span>{quiz.max_attempts} attempt(s) allowed · {completed.length} used</span>
            {quiz.due_at && <span>Due {formatDateTime(quiz.due_at)}</span>}
          </div>
        </CardContent>
      </Card>

      {completed.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Your attempts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completed.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">Attempt {a.attempt_number}</span>
                <Link href={`/quizzes/${quizId}/results?attempt=${a.id}`}><Button variant="outline" size="sm">View result</Button></Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        {inProgress ? (
          <Link href={`/quizzes/${quizId}/attempt`}><Button>Resume attempt</Button></Link>
        ) : canAttempt ? (
          <Link href={`/quizzes/${quizId}/attempt`}><Button>Start attempt</Button></Link>
        ) : (
          <Badge variant="muted">{isPastDue ? "Deadline passed" : "No attempts remaining"}</Badge>
        )}
      </div>
    </div>
  );
}
