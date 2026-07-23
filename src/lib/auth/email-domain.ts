import { z } from "zod";

/**
 * Single source of truth for the institutional email restriction.
 * Imported by: the client registration form, the server registration
 * action, integration tests, and documented as mirrored by the
 * `handle_new_user` Postgres trigger (supabase/migrations/0009_functions_and_triggers.sql)
 * as a third, independent layer. Changing the allowed domain means changing
 * ONLY this constant (and the `ALLOWED_EMAIL_DOMAIN` env var / institution_settings row).
 */
export const ALLOWED_EMAIL_DOMAIN =
  process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase().trim() || "tcetmumbai.in";

export const INVALID_DOMAIN_MESSAGE =
  "CampusLearn is currently available only to users with a valid @tcetmumbai.in institutional email address.";

// Reasonably strict RFC-5322-ish syntax check; intentionally conservative
// rather than exhaustive, matching what client-side + server-side validation
// commonly agree on.
const EMAIL_SYNTAX_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface EmailValidationResult {
  ok: boolean;
  normalizedEmail: string;
  error?: string;
}

/**
 * Trims, lowercases, validates syntax, and checks that the domain is EXACTLY
 * `ALLOWED_EMAIL_DOMAIN` — not a subdomain (`sub.tcetmumbai.in`), not a
 * suffix trick (`tcetmumbai.in.fake.com`), and not merely "contains" the
 * domain string. This is the function both the client form and the server
 * action must call; never re-implement this check elsewhere.
 */
export function normalizeAndValidateEmail(rawEmail: string): EmailValidationResult {
  const normalizedEmail = (rawEmail ?? "").trim().toLowerCase();

  if (!normalizedEmail) {
    return { ok: false, normalizedEmail, error: "Email address is required." };
  }

  if (!EMAIL_SYNTAX_REGEX.test(normalizedEmail)) {
    return { ok: false, normalizedEmail, error: "Enter a valid email address." };
  }

  const atIndex = normalizedEmail.lastIndexOf("@");
  const domain = normalizedEmail.slice(atIndex + 1);

  if (domain !== ALLOWED_EMAIL_DOMAIN) {
    return { ok: false, normalizedEmail, error: INVALID_DOMAIN_MESSAGE };
  }

  return { ok: true, normalizedEmail };
}

/** Zod schema wrapping the same logic, for use inside react-hook-form + Server Action validation. */
export const institutionalEmailSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .superRefine((email, ctx) => {
    const result = normalizeAndValidateEmail(email);
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error });
    }
  });
