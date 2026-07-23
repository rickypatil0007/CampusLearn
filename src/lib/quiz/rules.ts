/**
 * Pure quiz-attempt eligibility rules, extracted from startAttemptAction
 * (src/app/(app)/quizzes/_actions.ts) so deadline and attempt-limit logic
 * can be unit tested without a database or clock mocking gymnastics (the
 * caller passes `now` explicitly).
 */
export interface AttemptEligibilityInput {
  quizStatus: "draft" | "scheduled" | "published" | "closed";
  dueAt: Date | null;
  maxAttempts: number;
  attemptsUsed: number;
  now: Date;
}

export type AttemptEligibilityResult =
  | { allowed: true }
  | { allowed: false; reason: "not_published" | "deadline_passed" | "max_attempts_reached" };

export function checkAttemptEligibility(input: AttemptEligibilityInput): AttemptEligibilityResult {
  if (input.quizStatus !== "published") return { allowed: false, reason: "not_published" };
  if (input.dueAt && input.dueAt.getTime() < input.now.getTime()) return { allowed: false, reason: "deadline_passed" };
  if (input.attemptsUsed >= input.maxAttempts) return { allowed: false, reason: "max_attempts_reached" };
  return { allowed: true };
}
