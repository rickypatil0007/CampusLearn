"use server";
import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { announcementSchema, crAnnouncementSchema } from "@/lib/validation/announcements";
import type { ActionResult } from "@/app/auth/actions";

/**
 * Faculty/Admin path: full target scope is whatever they submit (subject to
 * the form's own validation), published immediately (approval_status =
 * 'approved') since Faculty/Admin announcements never required review.
 */
export async function createAnnouncementAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("announcement.create");
  const supabase = await createClient();

  if (user.role === "class_rep") {
    // CR path: the target scope is NEVER taken from client input. It is
    // derived server-side from the CR's own active class assignment, and
    // published immediately with no approval step (spec sections 1, 8, 12).
    // This also means a CR literally cannot submit a form value that
    // targets another class/department/subject/institution-wide audience --
    // there is no code path that reads target_* from `input` for this role.
    const parsed = crAnnouncementSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid announcement." };

    const { data: assignment } = await supabase
      .from("class_representative_assignments")
      .select("department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id")
      .eq("student_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment) {
      return { ok: false, error: "You do not have an active Class Representative assignment." };
    }

    const { data: created, error } = await supabase
      .from("announcements")
      .insert({
        title: parsed.data.title,
        message: parsed.data.message,
        priority: parsed.data.priority,
        target_department_id: assignment.department_id,
        target_programme_id: assignment.programme_id,
        target_academic_year_id: assignment.academic_year_id,
        target_year_of_study_id: assignment.year_of_study_id,
        target_semester_id: assignment.semester_id,
        target_division_id: assignment.division_id,
        target_subject_id: null,
        approval_status: "approved",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: error?.message ?? "Could not publish announcement." };

    await supabase.from("audit_logs").insert({
      actor_id: user.id, action: "announcement_publish_cr", target_table: "announcements", target_id: created.id,
    });

    revalidatePath("/announcements");
    return { ok: true, data: undefined };
  }

  // Faculty / Admin path.
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid announcement." };

  const { error } = await supabase.from("announcements").insert({
    title: parsed.data.title,
    message: parsed.data.message,
    target_department_id: parsed.data.targetDepartmentId || null,
    target_programme_id: parsed.data.targetProgrammeId || null,
    target_academic_year_id: parsed.data.targetAcademicYearId || null,
    target_year_of_study_id: parsed.data.targetYearOfStudyId || null,
    target_semester_id: parsed.data.targetSemesterId || null,
    target_division_id: parsed.data.targetDivisionId || null,
    target_subject_id: parsed.data.targetSubjectId || null,
    priority: parsed.data.priority,
    approval_status: "approved",
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/announcements");
  return { ok: true, data: undefined };
}

export async function approveAnnouncementAction(id: string, approve: boolean): Promise<ActionResult> {
  const user = await requirePermission("announcement.publish");
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").update({ approval_status: approve ? "approved" : "rejected" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_logs").insert({ actor_id: user.id, action: approve ? "announcement_approve" : "announcement_reject", target_table: "announcements", target_id: id });
  revalidatePath("/announcements");
  return { ok: true, data: undefined };
}

export async function deleteAnnouncementAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("announcements").select("created_by").eq("id", id).maybeSingle();
  const isOwner = existing?.created_by === user.id;
  const isFacultyOrAdmin = ["faculty", "dept_admin", "super_admin"].includes(user.role);
  if (!isOwner && !isFacultyOrAdmin) return { ok: false, error: "You cannot delete this announcement." };

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({ actor_id: user.id, action: "announcement_delete", target_table: "announcements", target_id: id });
  revalidatePath("/announcements");
  return { ok: true, data: undefined };
}
