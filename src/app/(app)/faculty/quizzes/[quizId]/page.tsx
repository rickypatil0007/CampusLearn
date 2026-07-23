import { notFound } from "next/navigation";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddQuestionForm } from "./add-question-form";
import { PublishButton } from "./publish-button";

export default async function ManageQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: quiz } = await supabase.from("quizzes").select("id, title, status, created_by, subject_id").eq("id", quizId).maybeSingle();
  if (!quiz) notFound();
  if (quiz.created_by !== user.id && !["dept_admin", "super_admin"].includes(user.role)) throw new UnauthorizedError();

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, prompt, question_type, marks, question_options:question_options(id, option_text, is_correct)")
    .eq("quiz_id", quizId)
    .order("created_at");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{quiz.title}</h1>
          <Badge variant={quiz.status === "published" ? "success" : "muted"}>{quiz.status}</Badge>
        </div>
        {quiz.status === "draft" && <PublishButton quizId={quizId} hasQuestions={(questions?.length ?? 0) > 0} />}
      </div>

      <Card>
        <CardHeader><CardTitle>Questions ({questions?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {questions && questions.length > 0 ? questions.map((q, i) => (
            <div key={q.id} className="rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">Q{i + 1}. {q.prompt} <span className="text-muted-foreground">({q.marks} marks)</span></p>
              <ul className="mt-2 space-y-1 text-sm">
                {(q.question_options as unknown as { id: string; option_text: string; is_correct: boolean }[])?.map((o) => (
                  <li key={o.id} className={o.is_correct ? "text-primary" : "text-muted-foreground"}>
                    {o.is_correct ? "✓ " : "— "}{o.option_text}
                  </li>
                ))}
              </ul>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">No questions yet. Add one below.</p>
          )}
        </CardContent>
      </Card>

      {quiz.status === "draft" && (
        <Card>
          <CardHeader><CardTitle>Add question</CardTitle></CardHeader>
          <CardContent><AddQuestionForm quizId={quizId} /></CardContent>
        </Card>
      )}
    </div>
  );
}
