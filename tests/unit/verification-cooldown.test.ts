import { describe, it, expect } from "vitest";
import { computeCooldownDecision, computeNextAllowedAt, RESEND_COOLDOWN_SECONDS } from "@/lib/auth/verification-cooldown";

describe("computeCooldownDecision", () => {
  it("allows the first request when there is no existing row", () => {
    const decision = computeCooldownDecision(new Date("2026-01-01T00:00:00Z"), null);
    expect(decision).toEqual({ allowed: true, waitSeconds: 0 });
  });

  it("blocks a request made before next_allowed_at, reporting seconds remaining", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const existing = { next_allowed_at: new Date("2026-01-01T00:00:45Z").toISOString() };
    const decision = computeCooldownDecision(now, existing);
    expect(decision.allowed).toBe(false);
    expect(decision.waitSeconds).toBe(45);
  });

  it("allows a request exactly at next_allowed_at", () => {
    const now = new Date("2026-01-01T00:01:00Z");
    const existing = { next_allowed_at: now.toISOString() };
    expect(computeCooldownDecision(now, existing).allowed).toBe(true);
  });

  it("allows a request after next_allowed_at has passed", () => {
    const now = new Date("2026-01-01T00:02:00Z");
    const existing = { next_allowed_at: new Date("2026-01-01T00:01:00Z").toISOString() };
    expect(computeCooldownDecision(now, existing).allowed).toBe(true);
  });
});

describe("computeNextAllowedAt", () => {
  it("adds exactly the cooldown window to now", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const next = computeNextAllowedAt(now);
    expect(new Date(next).getTime() - now.getTime()).toBe(RESEND_COOLDOWN_SECONDS * 1000);
  });
});
