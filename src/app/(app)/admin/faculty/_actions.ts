"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteFacultySchema, teachingAssignmentSchema } from "@/lib/validation/faculty";
import type { ActionResult } from "@/app/auth/actions";
import { normalizeAndValidateEmail } from "@/lib/auth/email-domain";

/**
 * Faculty Management (spec section 4). Administrator creates the account
 * directly with a generated temporary password rather than a true
 * passwordless email-invite flow, because that requires a configured SMTP
 * provider this environment does not have credentials for -- see
 * docs/LIMITATIONS.md. The account still requires email verification
 * before it can log in (handle_new_user / Supabase Auth email_confirmed_at
 * gate, unchanged from the student registration flow), and the temporary
 * password is returned once, to the Administrator only, never logged.
 */
export async function inviteFacultyAction(input: unknown): Promise<ActionResult<{ email: string; temporaryPassword: string }>> {
  const caller = await requirePermission("faculty.manage");
  const parsed = inviteFacultySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid faculty details." };

  const emailCheck = normalizeAndValidateEmail(parsed.data.email);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error! };

  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: existing } = await supabase.from("profiles").select("id").eq("email", emailCheck.normalizedEmail).maybeSingle();
  if (existing) return { ok: false, error: "An account with this email already exists." };

  const temporaryPassword = `Tcet${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 6).toUpperCase()}!`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: emailCheck.normalizedEmail,
    password: temporaryPassword,
    email_confirm: false,
  });
  if (createError || !created.user) return { ok: false, error: createError?.message ?? "Could not create the account." };

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: parsed.data.fullName,
    email: emailCheck.normalizedEmail,
    role: "faculty",
    department_id: parsed.data.departmentId,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: profileError.message };
  }

  await admin.from("audit_logs").insert({
    actor_id: caller.id, action: "faculty_invite", target_table: "profiles", target_id: created.user.id,
    metadata: { department_id: parsed.data.departmentId },
  });

  revalidatePath("/admin/faculty");
  return { ok: true, data: { email: emailCheck.normalizedEmail, temporaryPassword } };
}

export async function assignFacultyTeachingAction(input: unknown): Promise<ActionResult> {
  const caller = await requirePermission("faculty.manage");
  const parsed = teachingAssignmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assignment." };

  const supabase = await createClient();
  const { data: faculty } = await supabase.from("profiles").select("role").eq("id", parsed.data.facultyId).maybeSingle();
  if (!faculty || faculty.role !== "faculty") return { ok: false, error: "Target user is not a Faculty member." };

  const { error } = await supabase.from("faculty_teaching_assignments").insert({
    faculty_id: parsed.data.facultyId,
    subject_id: parsed.data.subjectId,
    department_id: parsed.data.departmentId,
    programme_id: parsed.data.programmeId,
    academic_year_id: parsed.data.academicYearId,
    year_of_study_id: parsed.data.yearOfStudyId || null,
    semester_id: parsed.data.semesterId,
    division_id: parsed.data.divisionId,
    assigned_by: caller.id,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "This Faculty member already has an active assignment for this subject and class." };
    return { ok: false, error: error.message };
  }

  revalidatePath(`/admin/faculty/${parsed.data.facultyId}`);
  revalidatePath("/admin/faculty-assignments");
  return { ok: true, data: undefined };
}

export async function revokeFacultyTeachingAction(assignmentId: string, facultyId: string): Promise<ActionResult> {
  await requirePermission("faculty.manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("faculty_teaching_assignments")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("id", assignmentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/faculty/${facultyId}`);
  revalidatePath("/admin/faculty-assignments");
  return { ok: true, data: undefined };
}
