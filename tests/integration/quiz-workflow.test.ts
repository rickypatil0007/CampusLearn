import { describe, it, expect } from "vitest";
import { checkAttemptEligibility } from "@/lib/quiz/rules";
import { scoreQuizAttempt } from "@/lib/quiz/scoring";
import { can } from "@/lib/permissions/permissions";

/**
 * Exercises the quiz attempt + scoring pipeline as a sequence — eligibility
 * check, then scoring — the way startAttemptAction and submitAttemptAction
 * (src/app/(app)/quizzes/_actions.ts) chain them, without a database.
 */
describe("quiz attempt + scoring workflow", () => {
  it("a student who is eligible can attempt, and their answers are scored correctly", () => {
    expect(can("student", "quiz.attempt")).toBe(true);

    const eligibility = checkAttemptEligibility({
      quizStatus: "published", dueAt: new Date("2099-01-01"), maxAttempts: 1, attemptsUsed: 0, now: new Date(),
    });
    expect(eligibility.allowed).toBe(true);

    const result = scoreQuizAttempt(
      [{ id: "q1", marks: 5, topicId: null, questionType: "mcq_single" }],
      [{ id: "opt-correct", questionId: "q1", isCorrect: true }, { id: "opt-wrong", questionId: "q1", isCorrect: false }],
      [{ questionId: "q1", selectedOptionIds: ["opt-correct"] }]
    );
    expect(result.marksObtained).toBe(5);
  });

  it("a faculty member cannot attempt a quiz (permission layer blocks it before eligibility is even checked)", () => {
    expect(can("faculty", "quiz.attempt")).toBe(false);
  });

  it("a student past the deadline is blocked regardless of correct answers they could have given", () => {
    const eligibility = checkAttemptEligibility({
      quizStatus: "published", dueAt: new Date("2020-01-01"), maxAttempts: 3, attemptsUsed: 0, now: new Date(),
    });
    expect(eligibility).toEqual({ allowed: false, reason: "deadline_passed" });
  });
});
