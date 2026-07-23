"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser, UnauthorizedError } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { quizSchema, questionSchema, submitAnswerSchema } from "@/lib/validation/quizzes";
import { scoreQuizAttempt } from "@/lib/quiz/scoring";
import { checkAttemptEligibility } from "@/lib/quiz/rules";
import type { ActionResult } from "@/app/auth/actions";

export async function createQuizAction(input: unknown): Promise<ActionResult<{ quizId: string }>> {
  const user = await requirePermission("quiz.create");
  const parsed = quizSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid quiz details." };

  const supabase = await createClient();
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .insert({
      title: parsed.data.title, 
      description: parsed.data.description || null, 
      subject_id: parsed.data.subjectId,
      target_department_id: parsed.data.targetDepartmentId || null,
      target_programme_id: parsed.data.targetProgrammeId || null,
      target_academic_year_id: parsed.data.targetAcademicYearId || null,
      target_year_of_study_id: parsed.data.targetYearOfStudyId || null,
      target_semester_id: parsed.data.targetSemesterId || null,
      target_division_id: parsed.data.targetDivisionId || null,
      instructions: parsed.data.instructions || null, 
      time_limit_minutes: parsed.data.timeLimitMinutes ?? null,
      max_attempts: parsed.data.maxAttempts, 
      passing_marks: parsed.data.passingMarks ?? null,
      due_at: parsed.data.dueAt || null, 
      status: "draft", 
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !quiz) return { ok: false, error: error?.message ?? "Could not create quiz." };

  revalidatePath("/faculty/quizzes");
  return { ok: true, data: { quizId: quiz.id } };
}

export async function addQuestionAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("quiz.create");
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid question." };

  const supabase = await createClient();
  const { data: quiz } = await supabase.from("quizzes").select("subject_id, created_by").eq("id", parsed.data.quizId).single();
  if (!quiz || quiz.created_by !== user.id) throw new UnauthorizedError("You can only edit your own quizzes.");

  const { data: question, error } = await supabase
    .from("quiz_questions")
    .insert({
      quiz_id: parsed.data.quizId, subject_id: quiz.subject_id, question_type: parsed.data.questionType,
      prompt: parsed.data.prompt, explanation: parsed.data.explanation || null, marks: parsed.data.marks, created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !question) return { ok: false, error: error?.message ?? "Could not add question." };

  if (parsed.data.options?.length) {
    const { error: optError } = await supabase.from("question_options").insert(
      parsed.data.options.map((o, i) => ({ question_id: question.id, option_text: o.text, is_correct: o.isCorrect, sequence: i + 1 }))
    );
    if (optError) return { ok: false, error: optError.message };
  }

  revalidatePath(`/faculty/quizzes/${parsed.data.quizId}`);
  return { ok: true, data: undefined };
}

export async function publishQuizAction(quizId: string): Promise<ActionResult> {
  const user = await requirePermission("quiz.publish");
  const supabase = await createClient();

  const { data: quiz } = await supabase.from("quizzes").select("created_by, subject_id, target_division_id").eq("id", quizId).single();
  if (!quiz || quiz.created_by !== user.id) throw new UnauthorizedError("You can only publish your own quizzes.");

  if (!quiz.target_division_id) {
    return { ok: false, error: "A quiz must target a specific division before it can be published." };
  }

  const { count: questionCount } = await supabase.from("quiz_questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
  if (!questionCount) return { ok: false, error: "Add at least one question before publishing." };

  const { error } = await supabase.from("quizzes").update({ status: "published", start_at: new Date().toISOString() }).eq("id", quizId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({ actor_id: user.id, action: "quiz_publish", target_table: "quizzes", target_id: quizId });

  // Notify enrolled students.
  const { data: enrollments } = await supabase.from("subject_enrollments").select("student_id").eq("subject_id", quiz.subject_id);
  if (enrollments?.length) {
    const { data: quizRow } = await supabase.from("quizzes").select("title").eq("id", quizId).single();
    await supabase.from("notifications").insert(
      enrollments.map((e) => ({
        user_id: e.student_id, type: "quiz_published" as const, title: "New quiz published",
        body: quizRow?.title ?? "A new quiz is available.", link: `/quizzes/${quizId}`,
      }))
    );
  }

  revalidatePath("/faculty/quizzes");
  revalidatePath("/quizzes");
  return { ok: true, data: undefined };
}

/**
 * Starts (or resumes) an attempt. Enforces max-attempt and closing-date
 * rules server-side — this cannot be bypassed by the client since the
 * attempt count and quiz window are re-read from the database here.
 */
export async function startAttemptAction(quizId: string): Promise<ActionResult<{ attemptId: string }>> {
  const user = await requirePermission("quiz.attempt");
  const supabase = await createClient();

  const { data: quiz } = await supabase.from("quizzes").select("status, due_at, max_attempts").eq("id", quizId).single();
  if (!quiz) throw new UnauthorizedError("This quiz is not open for attempts.");

  const { data: existingAttempts } = await supabase
    .from("quiz_attempts").select("id, submitted_at").eq("quiz_id", quizId).eq("student_id", user.id).order("attempt_number", { ascending: false });

  const inProgress = existingAttempts?.find((a) => !a.submitted_at);
  if (inProgress) return { ok: true, data: { attemptId: inProgress.id } };

  const attemptsUsed = existingAttempts?.length ?? 0;
  const eligibility = checkAttemptEligibility({
    quizStatus: quiz.status, dueAt: quiz.due_at ? new Date(quiz.due_at) : null,
    maxAttempts: quiz.max_attempts, attemptsUsed, now: new Date(),
  });
  if (!eligibility.allowed) {
    if (eligibility.reason === "not_published") throw new UnauthorizedError("This quiz is not open for attempts.");
    if (eligibility.reason === "deadline_passed") return { ok: false, error: "The deadline for this quiz has passed." };
    return { ok: false, error: "You have used all allowed attempts for this quiz." };
  }

  const { data: attempt, error } = await supabase
    .from("quiz_attempts").insert({ quiz_id: quizId, student_id: user.id, attempt_number: attemptsUsed + 1 }).select("id").single();
  if (error || !attempt) return { ok: false, error: error?.message ?? "Could not start attempt." };

  return { ok: true, data: { attemptId: attempt.id } };
}

/** Autosave — never returns whether the answer is correct. */
export async function saveAnswerAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = submitAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid answer." };

  const supabase = await createClient();
  const { data: attempt } = await supabase.from("quiz_attempts").select("student_id, submitted_at").eq("id", parsed.data.attemptId).single();
  if (!attempt || attempt.student_id !== user.id) throw new UnauthorizedError("Not your attempt.");
  if (attempt.submitted_at) return { ok: false, error: "This attempt has already been submitted." };

  const { error } = await supabase.from("quiz_answers").upsert(
    {
      attempt_id: parsed.data.attemptId, question_id: parsed.data.questionId,
      selected_option_ids: parsed.data.selectedOptionIds ?? [], free_text_answer: parsed.data.freeTextAnswer ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id,question_id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

/**
 * Server-authoritative scoring. Correct answers never leave the server
 * until this point — the client only ever sends option IDs it selected,
 * and this function is the only place `is_correct` is computed by
 * comparing against `question_options.is_correct` fetched fresh from the DB.
 */
export async function submitAttemptAction(attemptId: string): Promise<ActionResult<{ attemptId: string }>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: attempt } = await supabase.from("quiz_attempts").select("id, student_id, submitted_at, quiz_id, started_at").eq("id", attemptId).single();
  if (!attempt || attempt.student_id !== user.id) throw new UnauthorizedError("Not your attempt.");
  if (attempt.submitted_at) return { ok: true, data: { attemptId } };

  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase.from("quiz_questions").select("id, marks, topic_id, question_type").eq("quiz_id", attempt.quiz_id),
    supabase.from("quiz_answers").select("id, question_id, selected_option_ids").eq("attempt_id", attemptId),
  ]);

  const questionIds = (questions ?? []).map((q) => q.id);
  const { data: options } = await supabase.from("question_options").select("id, question_id, is_correct").in("question_id", questionIds.length ? questionIds : ["00000000-0000-0000-0000-000000000000"]);

  const scoringQuestions = (questions ?? []).map((q) => ({
    id: q.id, marks: Number(q.marks), topicId: q.topic_id, questionType: q.question_type,
  }));
  const scoringOptions = (options ?? []).map((o) => ({ id: o.id, questionId: o.question_id, isCorrect: o.is_correct }));
  const scoringAnswers = (answers ?? []).map((a) => ({
    questionId: a.question_id, selectedOptionIds: (a.selected_option_ids as string[] | null) ?? [],
  }));

  const result = scoreQuizAttempt(scoringQuestions, scoringOptions, scoringAnswers);

  for (const q of scoringQuestions) {
    const scored = result.perQuestion.find((p) => p.questionId === q.id)!;
    const existingAnswer = answers?.find((a) => a.question_id === q.id);
    if (existingAnswer) {
      await supabase.from("quiz_answers").update({ is_correct: scored.isCorrect, marks_awarded: scored.marksAwarded }).eq("id", existingAnswer.id);
    } else {
      await supabase.from("quiz_answers").insert({ attempt_id: attemptId, question_id: q.id, is_correct: scored.isCorrect, marks_awarded: scored.marksAwarded, selected_option_ids: [] });
    }
  }

  const timeTaken = Math.round((Date.now() - new Date(attempt.started_at).getTime()) / 1000);
  await supabase.from("quiz_attempts").update({ submitted_at: new Date().toISOString(), time_taken_seconds: timeTaken }).eq("id", attemptId);

  const { data: quiz } = await supabase.from("quizzes").select("passing_marks").eq("id", attempt.quiz_id).single();

  await supabase.from("quiz_results").insert({
    attempt_id: attemptId, total_marks: result.totalMarks, marks_obtained: result.marksObtained, accuracy: result.accuracy,
    passed: quiz?.passing_marks != null ? result.marksObtained >= quiz.passing_marks : null,
    weak_topic_ids: result.weakTopicIds, strong_topic_ids: result.strongTopicIds,
  });

  revalidatePath(`/quizzes/${attempt.quiz_id}`);
  return { ok: true, data: { attemptId } };
}
