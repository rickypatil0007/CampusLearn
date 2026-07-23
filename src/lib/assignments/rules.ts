/**
 * Pure assignment-submission eligibility rules, extracted from
 * submitAssignmentAction (src/app/(app)/assignments/_actions.ts).
 */
export interface SubmissionEligibilityInput {
  dueAt: Date;
  now: Date;
  lateSubmissionAllowed: boolean;
  allowResubmission: boolean;
  existingStatus: "not_started" | "submitted" | "late" | "under_review" | "graded" | "resubmission_requested" | null;
}

export type SubmissionEligibilityResult =
  | { allowed: true; isLate: boolean }
  | { allowed: false; reason: "deadline_passed" | "resubmission_not_allowed" };

export function checkSubmissionEligibility(input: SubmissionEligibilityInput): SubmissionEligibilityResult {
  const isLate = input.dueAt.getTime() < input.now.getTime();
  if (isLate && !input.lateSubmissionAllowed) return { allowed: false, reason: "deadline_passed" };

  const alreadySubmitted = input.existingStatus === "submitted" || input.existingStatus === "late" || input.existingStatus === "graded";
  if (alreadySubmitted && !input.allowResubmission && input.existingStatus !== "resubmission_requested") {
    return { allowed: false, reason: "resubmission_not_allowed" };
  }

  return { allowed: true, isLate };
}
