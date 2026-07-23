import { notFound, redirect } from "next/navigation";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { startAttemptAction } from "../../_actions";
import { QuizAttemptForm } from "./attempt-form";

export default async function QuizAttemptPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  await requireUserOrRedirect();
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, time_limit_minutes, randomize_questions, status")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz || quiz.status !== "published") notFound();

  const startResult = await startAttemptAction(quizId);
  if (!startResult.ok) redirect(`/quizzes/${quizId}?error=${encodeURIComponent(startResult.error)}`);

  // Questions WITHOUT is_correct/explanation — correctness is never exposed
  // to the client before submission (see submitAttemptAction on the server).
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, question_type, prompt, marks, sequence, question_options:question_options(id, option_text, sequence)")
    .eq("quiz_id", quizId)
    .order("sequence");

  const { data: existingAnswers } = await supabase
    .from("quiz_answers").select("question_id, selected_option_ids, free_text_answer").eq("attempt_id", startResult.data.attemptId);

  return (
    <QuizAttemptForm
      quizId={quizId}
      quizTitle={quiz.title}
      attemptId={startResult.data.attemptId}
      timeLimitMinutes={quiz.time_limit_minutes}
      questions={(questions ?? []).map((q) => ({
        id: q.id, type: q.question_type, prompt: q.prompt, marks: Number(q.marks),
        options: ((q.question_options as unknown as { id: string; option_text: string; sequence: number }[]) ?? [])
          .sort((a, b) => a.sequence - b.sequence)
          .map((o) => ({ id: o.id, text: o.option_text })),
      }))}
      existingAnswers={(existingAnswers ?? []).map((a) => ({
        questionId: a.question_id, selectedOptionIds: (a.selected_option_ids as string[] | null) ?? [], freeText: a.free_text_answer ?? "",
      }))}
    />
  );
}
