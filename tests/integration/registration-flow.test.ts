import { describe, it, expect } from "vitest";
import { registerSchema } from "@/lib/validation/auth";
import { normalizeAndValidateEmail } from "@/lib/auth/email-domain";

/**
 * These tests exercise the full client-side validation pipeline
 * (Zod schema + centralized email-domain check) exactly as the
 * registration form and Server Action invoke it, WITHOUT touching a
 * database. Updated for the Student-ID-based registration flow
 * (studentId "S" + 10 digits, with the institutional email derived from
 * it and independently re-checked server-side) -- see
 * registerAction() in src/app/auth/actions.ts.
 *
 * True end-to-end registration (hitting Supabase Auth + the
 * `handle_new_user` trigger + RLS) requires a live Supabase project and is
 * covered instead by tests/e2e/registration.spec.ts, which needs
 * `supabase start` (or a hosted test project) and the app running via
 * `npm run dev`. See docs/TESTING.md for how to run those.
 */

const baseInput = {
  fullName: "Ananya Sharma",
  studentId: "S1032250917",
  password: "StrongPass1",
  confirmPassword: "StrongPass1",
  departmentId: "11111111-1111-1111-1111-111111111111",
  programmeId: "22222222-2222-2222-2222-222222222222",
  academicYearId: "33333333-3333-3333-3333-333333333333",
  yearOfStudyId: "66666666-6666-6666-6666-666666666666",
  semesterId: "44444444-4444-4444-4444-444444444444",
  divisionId: "55555555-5555-5555-5555-555555555555",
  rollNumber: "42",
  acceptedTerms: true as const,
};

describe("registration validation pipeline", () => {
  it("accepts a full valid registration payload where the email matches the derived Student ID email", () => {
    const result = registerSchema.safeParse({ ...baseInput, email: "1032250917@tcetmumbai.in" });
    expect(result.success).toBe(true);
  });

  it("rejects an email that does not match the Student ID it was derived from", () => {
    const result = registerSchema.safeParse({ ...baseInput, email: "9999999999@tcetmumbai.in" });
    expect(result.success).toBe(false);
  });

  it("rejects a gmail.com email even with an otherwise valid payload", () => {
    const result = registerSchema.safeParse({ ...baseInput, email: "student@gmail.com" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed Student ID (wrong prefix or digit count)", () => {
    expect(registerSchema.safeParse({ ...baseInput, studentId: "1032250917", email: "1032250917@tcetmumbai.in" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...baseInput, studentId: "S103225091", email: "103225091@tcetmumbai.in" }).success).toBe(false);
  });

  it("rejects a roll number outside 01-70 or with the wrong format", () => {
    expect(registerSchema.safeParse({ ...baseInput, email: "1032250917@tcetmumbai.in", rollNumber: "00" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...baseInput, email: "1032250917@tcetmumbai.in", rollNumber: "71" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...baseInput, email: "1032250917@tcetmumbai.in", rollNumber: "1" }).success).toBe(false);
  });

  it("rejects when passwords do not match", () => {
    const result = registerSchema.safeParse({ ...baseInput, email: "1032250917@tcetmumbai.in", confirmPassword: "Different1" });
    expect(result.success).toBe(false);
  });

  it("rejects when terms are not accepted", () => {
    const result = registerSchema.safeParse({ ...baseInput, email: "1032250917@tcetmumbai.in", acceptedTerms: false });
    expect(result.success).toBe(false);
  });

  it("accepts a mismatched-case/whitespace-padded email as long as it still matches the Student ID case-insensitively", () => {
    // The Zod schema's own comparison is case-insensitive (data.email.toLowerCase() === expectedEmail),
    // but it does not itself rewrite the stored value to lowercase -- that
    // normalization is the server action's job (see next test), matching
    // "never trust client-submitted email, always re-validate server-side".
    const parsed = registerSchema.safeParse({ ...baseInput, email: "  1032250917@TCETMUMBAI.IN  " });
    expect(parsed.success).toBe(true);
  });

  it("server-side normalizeAndValidateEmail lowercases and trims independently of the schema (defense in depth)", () => {
    const emailCheck = normalizeAndValidateEmail("  1032250917@TCETMUMBAI.IN  ");
    expect(emailCheck.ok).toBe(true);
    expect(emailCheck.normalizedEmail).toBe("1032250917@tcetmumbai.in");
  });

  it("mirrors the server-side domain check independently of the schema (defense in depth)", () => {
    // Simulates the Server Action re-validating the email after Zod parsing,
    // as registerAction() does in src/app/auth/actions.ts.
    const emailCheck = normalizeAndValidateEmail("student@sub.tcetmumbai.in");
    expect(emailCheck.ok).toBe(false);
  });
});
