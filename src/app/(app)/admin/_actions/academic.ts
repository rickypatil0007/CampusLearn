"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { 
  departmentSchema, programmeSchema, subjectSchema, assignRoleSchema,
  academicYearSchema, yearOfStudySchema, semesterSchema, divisionSchema
} from "@/lib/validation/academic";
import type { ActionResult } from "@/app/auth/actions";

export async function createDepartmentAction(input: unknown): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid department details." };

  const supabase = await createClient();
  const { data: institution } = await supabase.from("institutions").select("id").limit(1).maybeSingle();
  if (!institution) return { ok: false, error: "No institution record found. Seed the database first." };

  const { error } = await supabase.from("departments").insert({
    institution_id: institution.id, name: parsed.data.name, code: parsed.data.code,
    description: parsed.data.description || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/departments");
  return { ok: true, data: undefined };
}

export async function deleteDepartmentAction(departmentId: string): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("departments").update({ deleted_at: new Date().toISOString() }).eq("id", departmentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/departments");
  return { ok: true, data: undefined };
}

export async function createProgrammeAction(input: unknown): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const parsed = programmeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid programme details." };

  const supabase = await createClient();
  const { error } = await supabase.from("programmes").insert({
    department_id: parsed.data.departmentId, name: parsed.data.name, code: parsed.data.code,
    duration_years: parsed.data.durationYears,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/programmes");
  return { ok: true, data: undefined };
}

export async function createSubjectAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("academic_structure.manage");
  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid subject details." };

  const supabase = await createClient();
  const { error } = await supabase.from("subjects").insert({
    name: parsed.data.name, code: parsed.data.code, description: parsed.data.description || null,
    credits: parsed.data.credits, department_id: parsed.data.departmentId, semester_id: parsed.data.semesterId,
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/subjects");
  return { ok: true, data: undefined };
}

export async function deleteSubjectAction(subjectId: string): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").update({ deleted_at: new Date().toISOString() }).eq("id", subjectId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/subjects");
  return { ok: true, data: undefined };
}

export async function assignFacultyToSubjectAction(subjectId: string, facultyId: string): Promise<ActionResult> {
  const user = await requirePermission("faculty.assign_subject");
  const supabase = await createClient();
  const { error } = await supabase.from("subject_faculty").insert({ subject_id: subjectId, faculty_id: facultyId, assigned_by: user.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/subjects");
  return { ok: true, data: undefined };
}

/**
 * Central role-assignment entrypoint. Delegates the actual permission
 * matrix (who may grant what) to the `assign_role` Postgres function so the
 * rule is enforced identically regardless of call path. Never accepts a
 * role change to/from the caller's own account implicitly — callers always
 * pass an explicit target userId, and self-elevation is blocked by the
 * `assign_role` function checking the CALLER's current role, not any value
 * supplied by the client.
 */
export async function assignRoleAction(input: unknown): Promise<ActionResult> {
  const caller = await requireUser();
  const parsed = assignRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid role assignment." };

  if (parsed.data.userId === caller.id) {
    return { ok: false, error: "You cannot change your own role." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_role", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
    p_scope_department_id: parsed.data.scopeDepartmentId ?? null,
    p_scope_division_id: parsed.data.scopeDivisionId ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  revalidatePath("/admin/roles");
  return { ok: true, data: undefined };
}

export async function suspendUserAction(userId: string, suspend: boolean, reason?: string): Promise<ActionResult> {
  const caller = await requirePermission("user.suspend");
  if (userId === caller.id) return { ok: false, error: "You cannot suspend your own account." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_suspended: suspend, suspended_reason: suspend ? reason || "Suspended by administrator" : null })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({
    actor_id: caller.id, action: suspend ? "account_suspend" : "account_unsuspend",
    target_table: "profiles", target_id: userId, metadata: { reason: reason ?? null },
  });

  revalidatePath("/admin/users");
  return { ok: true, data: undefined };
}

/**
 * Admin-created Faculty/Dept-Admin account (spec: "Faculty accounts should
 * be created or invited by an administrator"). Uses the service-role client
 * to create the auth user directly with a temporary password and marks
 * email as pre-confirmed; a real deployment would instead send an email
 * invite link — documented as a known limitation in README.
 */
export async function inviteStaffAction(email: string, fullName: string, role: "faculty" | "dept_admin", departmentId?: string): Promise<ActionResult> {
  const caller = await requirePermission("role.assign_faculty_or_admin");
  const admin = createAdminClient();

  const tempPassword = crypto.randomUUID().slice(0, 16) + "!Aa1";
  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(), password: tempPassword, email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) return { ok: false, error: error.message };

  await admin.from("profiles").update({ role, department_id: departmentId ?? null }).eq("id", data.user!.id);
  await admin.from("user_roles").insert({ user_id: data.user!.id, role, assigned_by: caller.id });
  await admin.from("audit_logs").insert({
    actor_id: caller.id, action: "role_change", target_table: "profiles", target_id: data.user!.id,
    metadata: { new_role: role, via: "invite" },
  });

  revalidatePath("/admin/invitations");
  return { ok: true, data: undefined };
}

export async function createAcademicYearAction(input: unknown): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const parsed = academicYearSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid academic year details." };
  const supabase = await createClient();
  const { error } = await supabase.from("academic_years").insert({
    label: parsed.data.label, is_current: parsed.data.isCurrent, start_date: parsed.data.startDate, end_date: parsed.data.endDate
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/academic-sessions");
  return { ok: true, data: undefined };
}

export async function deleteAcademicYearAction(id: string): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("academic_years").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/academic-sessions");
  return { ok: true, data: undefined };
}

export async function createYearOfStudyAction(input: unknown): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const parsed = yearOfStudySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid year of study details." };
  const supabase = await createClient();
  const { error } = await supabase.from("years_of_study").insert({
    name: parsed.data.name, level: parsed.data.level
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/years-of-study");
  return { ok: true, data: undefined };
}

export async function deleteYearOfStudyAction(id: string): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("years_of_study").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/years-of-study");
  return { ok: true, data: undefined };
}

export async function createSemesterAction(input: unknown): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const parsed = semesterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid semester details." };
  const supabase = await createClient();
  const { error } = await supabase.from("semesters").insert({
    programme_id: parsed.data.programmeId, academic_year_id: parsed.data.academicYearId,
    year_of_study_id: parsed.data.yearOfStudyId, number: parsed.data.number, name: parsed.data.name
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/semesters");
  return { ok: true, data: undefined };
}

export async function deleteSemesterAction(id: string): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("semesters").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/semesters");
  return { ok: true, data: undefined };
}

export async function createDivisionAction(input: unknown): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const parsed = divisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid division details." };
  const supabase = await createClient();
  const { error } = await supabase.from("divisions").insert({
    semester_id: parsed.data.semesterId, name: parsed.data.name
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/divisions");
  return { ok: true, data: undefined };
}

export async function deleteDivisionAction(id: string): Promise<ActionResult> {
  await requirePermission("academic_structure.manage");
  const supabase = await createClient();
  const { error } = await supabase.from("divisions").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/divisions");
  return { ok: true, data: undefined };
}

