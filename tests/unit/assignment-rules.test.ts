import { describe, it, expect } from "vitest";
import { checkSubmissionEligibility } from "@/lib/assignments/rules";

const now = new Date("2026-07-19T12:00:00Z");
const past = new Date("2026-07-18T00:00:00Z");
const future = new Date("2026-07-20T00:00:00Z");

describe("checkSubmissionEligibility", () => {
  it("allows an on-time first submission", () => {
    const result = checkSubmissionEligibility({ dueAt: future, now, lateSubmissionAllowed: false, allowResubmission: false, existingStatus: null });
    expect(result).toEqual({ allowed: true, isLate: false });
  });

  it("blocks a late submission when late submission is not allowed", () => {
    const result = checkSubmissionEligibility({ dueAt: past, now, lateSubmissionAllowed: false, allowResubmission: false, existingStatus: null });
    expect(result).toEqual({ allowed: false, reason: "deadline_passed" });
  });

  it("allows a late submission and flags it as late when late submission is allowed", () => {
    const result = checkSubmissionEligibility({ dueAt: past, now, lateSubmissionAllowed: true, allowResubmission: false, existingStatus: null });
    expect(result).toEqual({ allowed: true, isLate: true });
  });

  it("blocks resubmission when not allowed and already submitted", () => {
    const result = checkSubmissionEligibility({ dueAt: future, now, lateSubmissionAllowed: false, allowResubmission: false, existingStatus: "submitted" });
    expect(result).toEqual({ allowed: false, reason: "resubmission_not_allowed" });
  });

  it("allows resubmission when explicitly allowed", () => {
    const result = checkSubmissionEligibility({ dueAt: future, now, lateSubmissionAllowed: false, allowResubmission: true, existingStatus: "submitted" });
    expect(result.allowed).toBe(true);
  });

  it("always allows a follow-up submission after Faculty requests resubmission", () => {
    const result = checkSubmissionEligibility({ dueAt: future, now, lateSubmissionAllowed: false, allowResubmission: false, existingStatus: "resubmission_requested" });
    expect(result.allowed).toBe(true);
  });
});
