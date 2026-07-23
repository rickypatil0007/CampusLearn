import type { Role } from "./roles";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Centralized permission matrix (spec section 5). This module is the ONLY
 * place permission decisions are defined; every Server Action / Route
 * Handler must call `can()` (or `requirePermission`) rather than
 * re-implementing role checks inline, and must always source the caller's
 * role from the database (see requireUser/requireRole in lib/auth/session.ts)
 * rather than trusting anything sent from the browser.
 *
 * IMPORTANT: These checks gate whether a Server Action proceeds. They are a
 * second layer on top of — never a replacement for — Postgres Row-Level
 * Security, which enforces the same rules independently at the database.
 */
export const PERMISSIONS = {
  // Resources
  "resource.view_approved": ["student", "class_rep", "faculty", "dept_admin", "super_admin"],
  "resource.upload": ["class_rep", "faculty", "dept_admin", "super_admin"],
  "resource.approve": ["faculty", "dept_admin", "super_admin"],
  "resource.delete_any": ["faculty", "dept_admin", "super_admin"],

  // Quizzes
  "quiz.attempt": ["student", "class_rep"],
  "quiz.create": ["faculty", "dept_admin", "super_admin"],
  "quiz.publish": ["faculty", "dept_admin", "super_admin"],
  "quiz.view_class_results": ["faculty", "dept_admin", "super_admin"],

  // Assignments
  "assignment.submit": ["student", "class_rep"],
  "assignment.create": ["faculty", "dept_admin", "super_admin"],
  "assignment.grade": ["faculty", "dept_admin", "super_admin"],

  // Announcements. CRs publish immediately for their own class (spec
  // section 8/12) -- "announcement.create" gates who may submit at all;
  // the Server Action independently derives/locks the CR's target scope
  // from their active class assignment. "announcement.publish" gates the
  // Faculty/Admin approve-or-reject moderation action for CR/other
  // submissions that still go through review (e.g. legacy pending rows).
  "announcement.create": ["class_rep", "faculty", "dept_admin", "super_admin"],
  "announcement.publish": ["faculty", "dept_admin", "super_admin"],

  // Discussions
  "discussion.moderate": ["faculty", "dept_admin", "super_admin"],

  // Academic structure & admin
  "academic_structure.manage": ["dept_admin", "super_admin"],
  "faculty.assign_subject": ["dept_admin", "super_admin"],
  "faculty.manage": ["dept_admin", "super_admin"], // Faculty Management area: invite/edit/deactivate, teaching assignments
  "resource.upload_batch": ["class_rep", "faculty", "dept_admin", "super_admin"],
  "role.assign_class_rep": ["faculty", "dept_admin", "super_admin"],
  "role.assign_faculty_or_admin": ["dept_admin", "super_admin"],
  "role.assign_super_admin": ["super_admin"],
  "class.assign_teacher": ["dept_admin", "super_admin"],
  "class.assign_cr": ["faculty", "dept_admin", "super_admin"],
  "user.suspend": ["dept_admin", "super_admin"],
  "institution.manage_settings": ["super_admin"],
  "audit_log.view": ["dept_admin", "super_admin"],
  "ai.manage_settings": ["super_admin"],

  // AI (all authenticated users, gated further by per-user rate limits)
  "ai.use_assistant": ["student", "class_rep", "faculty", "dept_admin", "super_admin"],
  "ai.draft_quiz": ["faculty", "dept_admin", "super_admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export async function requireUserNotSuspended(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data } = await supabase.from("profiles").select("is_suspended").eq("id", userId).maybeSingle();
  if (data?.is_suspended) {
    throw new Error("Your account has been suspended.");
  }
}

export async function isClassTeacherForClass(
  supabase: SupabaseClient,
  facultyId: string,
  classScope: {
    departmentId: string;
    programmeId: string;
    academicYearId: string;
    yearOfStudyId: string;
    semesterId: string;
    divisionId: string;
  }
): Promise<boolean> {
  const { data } = await supabase
    .from("class_teacher_assignments")
    .select("id")
    .match({
      faculty_id: facultyId,
      department_id: classScope.departmentId,
      programme_id: classScope.programmeId,
      academic_year_id: classScope.academicYearId,
      year_of_study_id: classScope.yearOfStudyId,
      semester_id: classScope.semesterId,
      division_id: classScope.divisionId,
      is_active: true,
    })
    .maybeSingle();
  return !!data;
}
