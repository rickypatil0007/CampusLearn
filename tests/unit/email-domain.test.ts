import { describe, it, expect } from "vitest";
import { normalizeAndValidateEmail, INVALID_DOMAIN_MESSAGE } from "@/lib/auth/email-domain";

describe("normalizeAndValidateEmail", () => {
  it("allows a valid tcetmumbai.in email", () => {
    const result = normalizeAndValidateEmail("student@tcetmumbai.in");
    expect(result.ok).toBe(true);
    expect(result.normalizedEmail).toBe("student@tcetmumbai.in");
  });

  it("normalizes case and trims whitespace, then allows it", () => {
    const result = normalizeAndValidateEmail("  STUDENT@TCETMUMBAI.IN  ");
    expect(result.ok).toBe(true);
    expect(result.normalizedEmail).toBe("student@tcetmumbai.in");
  });

  it("rejects gmail.com", () => {
    const result = normalizeAndValidateEmail("student@gmail.com");
    expect(result.ok).toBe(false);
    expect(result.error).toBe(INVALID_DOMAIN_MESSAGE);
  });

  it("rejects a subdomain of the allowed domain", () => {
    const result = normalizeAndValidateEmail("student@sub.tcetmumbai.in");
    expect(result.ok).toBe(false);
  });

  it("rejects a suffix-trick domain", () => {
    const result = normalizeAndValidateEmail("student@tcetmumbai.in.fake.com");
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed email missing the @ symbol", () => {
    const result = normalizeAndValidateEmail("studenttcetmumbai.in");
    expect(result.ok).toBe(false);
  });

  it("rejects a blank email", () => {
    const result = normalizeAndValidateEmail("");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Email address is required.");
  });

  it("rejects a blank/whitespace-only email", () => {
    const result = normalizeAndValidateEmail("   ");
    expect(result.ok).toBe(false);
  });

  it("rejects an email with no domain after @", () => {
    const result = normalizeAndValidateEmail("student@");
    expect(result.ok).toBe(false);
  });

  it("is case-insensitive on the domain portion specifically", () => {
    const result = normalizeAndValidateEmail("Student@TcetMumbai.In");
    expect(result.ok).toBe(true);
  });
});
