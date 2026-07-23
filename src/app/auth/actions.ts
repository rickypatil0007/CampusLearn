"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAndValidateEmail, INVALID_DOMAIN_MESSAGE } from "@/lib/auth/email-domain";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { computeCooldownDecision, computeNextAllowedAt } from "@/lib/auth/verification-cooldown";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Server-side registration. This is the SECOND independent enforcement of
 * the @tcetmumbai.in restriction (the client form is the first, the
 * `handle_new_user` DB trigger is the third) — see lib/auth/email-domain.ts.
 * Always assigns the Student role; there is no path here that accepts a
 * client-supplied role.
 */
export async function registerAction(formData: unknown): Promise<ActionResult<{ email: string }>> {
  const ip = await clientIp();
  const rl = await checkRateLimit(`register:${ip}`, RATE_LIMITS.register.limit, RATE_LIMITS.register.windowMs);
  if (!rl.allowed) {
    return { ok: false, error: "Too many registration attempts. Please try again later." };
  }

  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { fullName, password, departmentId, programmeId, academicYearId, yearOfStudyId, semesterId, divisionId, rollNumber, studentId } = parsed.data;

  const emailCheck = normalizeAndValidateEmail(parsed.data.email);
  if (!emailCheck.ok) {
    return { ok: false, error: emailCheck.error ?? INVALID_DOMAIN_MESSAGE, fieldErrors: { email: [emailCheck.error ?? INVALID_DOMAIN_MESSAGE] } };
  }

  const admin = createAdminClient();

  // Validate Student ID uniqueness before auth creation
  const { data: existingStudent } = await admin.from("profiles").select("id").eq("student_id", studentId).maybeSingle();
  if (existingStudent) {
    return { ok: false, error: "Student ID is already registered.", fieldErrors: { studentId: ["Student ID is already registered."] } };
  }

  // Validate Roll Number uniqueness in class before auth creation
  const { data: existingRoll } = await admin.from("profiles").select("id").match({
    academic_year_id: academicYearId,
    programme_id: programmeId,
    year_of_study_id: yearOfStudyId,
    semester_id: semesterId,
    division_id: divisionId,
    roll_number: rollNumber,
  }).maybeSingle();
  if (existingRoll) {
    return { ok: false, error: "Roll number is already registered in this class.", fieldErrors: { rollNumber: ["Roll number already taken."] } };
  }

  // Verify the academic structure hierarchy
  const { data: validStruct } = await admin.from("divisions")
    .select(`
      id,
      semesters!inner(
        id, 
        programme_id, 
        academic_year_id, 
        year_of_study_id,
        programmes!inner(department_id)
      )
    `)
    .eq("id", divisionId)
    .eq("semesters.id", semesterId)
    .eq("semesters.programme_id", programmeId)
    .eq("semesters.academic_year_id", academicYearId)
    .eq("semesters.year_of_study_id", yearOfStudyId)
    .eq("semesters.programmes.department_id", departmentId)
    .maybeSingle();

  if (!validStruct) {
    return { ok: false, error: "Invalid academic structure selection." };
  }

  const supabase = await createClient();
  const { data: signUpData, error } = await supabase.auth.signUp({
    email: emailCheck.normalizedEmail,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email`,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Use the user id returned directly by the Auth operation -- never scan
  // the full user list to find the account we just created (spec 6.1).
  const createdUserId = signUpData.user?.id;
  if (createdUserId) {
    await admin
      .from("profiles")
      .update({
        department_id: departmentId,
        programme_id: programmeId,
        academic_year_id: academicYearId,
        year_of_study_id: yearOfStudyId,
        semester_id: semesterId,
        division_id: divisionId,
        roll_number: rollNumber,
        student_id: studentId,
        role: "student",
      })
      .eq("id", createdUserId);
  }

  // Seed the durable resend cooldown: signUp already sent one verification
  // email, so an immediate "resend" click should still wait out the window.
  const now = new Date();
  await admin.from("email_verification_requests").upsert(
    { email: emailCheck.normalizedEmail, last_requested_at: now.toISOString(), next_allowed_at: computeNextAllowedAt(now), request_count: 1, last_status: "sent", updated_at: now.toISOString() },
    { onConflict: "email" }
  );

  return { ok: true, data: { email: emailCheck.normalizedEmail } };
}

export async function loginAction(formData: unknown, portal?: string): Promise<ActionResult> {
  const ip = await clientIp();
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and password." };
  }

  const rl = await checkRateLimit(`login:${ip}:${parsed.data.email}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
  if (!rl.allowed) {
    return { ok: false, error: "Too many login attempts. Please wait before trying again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Never surface raw provider error text (spec section 6.2/16). Map the
    // one case the UI needs to react to distinctly (unverified email);
    // everything else gets a single generic invalid-credentials message so
    // failed logins don't leak which part (email vs password) was wrong.
    if (/email not confirmed/i.test(error.message)) {
      return { ok: false, error: "Your email is not verified. Check your inbox or request a new verification link." };
    }
    return { ok: false, error: "Incorrect email or password." };
  }

  // After auth succeeds, fetch real role + status from DB
  const admin = createAdminClient();
  const { data: userProfile } = await admin.from("profiles").select("role, is_suspended").eq("email", parsed.data.email).maybeSingle();

  if (userProfile) {
    if (userProfile.is_suspended) {
      await supabase.auth.signOut();
      return { ok: false, error: "suspended" }; // Special error string to handle client-side redirect, or we can use next redirect
    }

    if (portal) {
      const dbRole = userProfile.role;
      let portalMatch = false;

      if (portal === "student" && dbRole === "student") portalMatch = true;
      if (portal === "class_rep" && dbRole === "class_rep") portalMatch = true;
      if (portal === "faculty" && dbRole === "faculty") portalMatch = true;
      if (portal === "admin" && (dbRole === "dept_admin" || dbRole === "super_admin")) portalMatch = true;

      if (!portalMatch) {
        await supabase.auth.signOut();
        let expectedPortal = dbRole;
        if (dbRole === "dept_admin" || dbRole === "super_admin") expectedPortal = "Admin";
        else if (dbRole === "class_rep") expectedPortal = "Class Rep";
        else expectedPortal = dbRole.charAt(0).toUpperCase() + dbRole.slice(1);
        
        return { ok: false, error: `This account belongs to the ${expectedPortal} portal. Please use ${expectedPortal} Login.` };
      }
    }
  }

  return { ok: true, data: undefined };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function forgotPasswordAction(formData: unknown): Promise<ActionResult> {
  const ip = await clientIp();
  const parsed = forgotPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const rl = await checkRateLimit(`reset:${ip}:${parsed.data.email}`, RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs);
  if (!rl.allowed) {
    return { ok: false, error: "Too many reset requests. Please wait before trying again." };
  }

  const supabase = await createClient();
  // Always return success even if the account doesn't exist, to avoid
  // leaking which emails are registered.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  return { ok: true, data: undefined };
}

export async function resetPasswordAction(formData: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: "Passwords do not meet the requirements." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: undefined };
}

/**
 * Resend the verification email. Enforces a 60-second cooldown that is
 * durable in Postgres (spec section 6.5) rather than in-memory/browser
 * state, so it holds across serverless cold starts and concurrent Vercel
 * function instances. Also rate-limited by IP on top of the per-email
 * cooldown, and deliberately returns the same generic message whether or
 * not the email is registered (spec 6.4: "without revealing whether
 * arbitrary email addresses are registered") -- the cooldown row itself is
 * created/updated identically regardless of whether the account exists, so
 * cooldown timing cannot be used as an enumeration side-channel either.
 */
export async function resendVerificationAction(email: string): Promise<ActionResult<{ nextAllowedAt: string }>> {
  const emailCheck = normalizeAndValidateEmail(email);
  if (!emailCheck.ok) {
    return { ok: false, error: emailCheck.error ?? INVALID_DOMAIN_MESSAGE };
  }

  const ip = await clientIp();
  const rl = await checkRateLimit(`resend-verify:${ip}`, RATE_LIMITS.resendVerification.limit, RATE_LIMITS.resendVerification.windowMs);
  if (!rl.allowed) {
    return { ok: false, error: "Too many requests. Please try again later." };
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: existing } = await admin
    .from("email_verification_requests")
    .select("next_allowed_at, request_count")
    .eq("email", emailCheck.normalizedEmail)
    .maybeSingle();

  const decision = computeCooldownDecision(now, existing);
  if (!decision.allowed) {
    return { ok: false, error: `Please wait ${decision.waitSeconds}s before requesting another verification email.` };
  }

  const nextAllowedAt = computeNextAllowedAt(now);

  // Best-effort: never let a provider error (including Supabase's own
  // "Email rate limit exceeded") throw or crash the request. The cooldown
  // row is written either way so a hostile caller can't bypass the wait by
  // triggering a provider error repeatedly.
  let lastStatus: "sent" | "rate_limited" | "provider_error" = "sent";
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email: emailCheck.normalizedEmail });
    if (error) {
      lastStatus = /rate limit/i.test(error.message) ? "rate_limited" : "provider_error";
    }
  } catch {
    lastStatus = "provider_error";
  }

  await admin.from("email_verification_requests").upsert(
    {
      email: emailCheck.normalizedEmail,
      last_requested_at: now.toISOString(),
      next_allowed_at: nextAllowedAt,
      request_count: (existing?.request_count ?? 0) + 1,
      last_status: lastStatus,
      updated_at: now.toISOString(),
    },
    { onConflict: "email" }
  );

  return { ok: true, data: { nextAllowedAt } };
}
