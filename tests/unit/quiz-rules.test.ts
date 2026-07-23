import { describe, it, expect } from "vitest";
import { checkAttemptEligibility } from "@/lib/quiz/rules";

const now = new Date("2026-07-19T12:00:00Z");

describe("checkAttemptEligibility", () => {
  it("rejects attempts on a non-published quiz", () => {
    const result = checkAttemptEligibility({ quizStatus: "draft", dueAt: null, maxAttempts: 3, attemptsUsed: 0, now });
    expect(result).toEqual({ allowed: false, reason: "not_published" });
  });

  it("rejects attempts after the due date", () => {
    const result = checkAttemptEligibility({
      quizStatus: "published", dueAt: new Date("2026-07-18T00:00:00Z"), maxAttempts: 3, attemptsUsed: 0, now,
    });
    expect(result).toEqual({ allowed: false, reason: "deadline_passed" });
  });

  it("rejects attempts once max_attempts is reached", () => {
    const result = checkAttemptEligibility({
      quizStatus: "published", dueAt: null, maxAttempts: 2, attemptsUsed: 2, now,
    });
    expect(result).toEqual({ allowed: false, reason: "max_attempts_reached" });
  });

  it("allows an attempt when published, before the deadline, with attempts remaining", () => {
    const result = checkAttemptEligibility({
      quizStatus: "published", dueAt: new Date("2026-07-20T00:00:00Z"), maxAttempts: 2, attemptsUsed: 1, now,
    });
    expect(result).toEqual({ allowed: true });
  });

  it("allows an attempt with no due date set", () => {
    const result = checkAttemptEligibility({ quizStatus: "published", dueAt: null, maxAttempts: 1, attemptsUsed: 0, now });
    expect(result).toEqual({ allowed: true });
  });
});
