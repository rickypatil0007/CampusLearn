/**
 * Pure cooldown math for the email verification resend flow (spec section
 * 6.5), extracted so it is unit-testable without a database. The Server
 * Action (resendVerificationAction) reads the current
 * email_verification_requests row, calls this function, and only then
 * decides whether to actually call Supabase Auth's resend API.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

export interface CooldownRow {
  next_allowed_at: string; // ISO timestamp
}

export interface CooldownDecision {
  allowed: boolean;
  waitSeconds: number; // 0 if allowed
}

export function computeCooldownDecision(now: Date, existing: CooldownRow | null): CooldownDecision {
  if (!existing) return { allowed: true, waitSeconds: 0 };
  const nextAllowed = new Date(existing.next_allowed_at).getTime();
  const remainingMs = nextAllowed - now.getTime();
  if (remainingMs <= 0) return { allowed: true, waitSeconds: 0 };
  return { allowed: false, waitSeconds: Math.ceil(remainingMs / 1000) };
}

export function computeNextAllowedAt(now: Date): string {
  return new Date(now.getTime() + RESEND_COOLDOWN_SECONDS * 1000).toISOString();
}
