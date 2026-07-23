"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/auth/actions";
import { z } from "zod";

const classScopeSchema = z.object({
  department_id: z.string().uuid(),
  programme_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  year_of_study_id: z.string().uuid(),
  semester_id: z.string().uuid(),
  division_id: z.string().uuid(),
});

const assignTeacherSchema = z.object({
  facultyId: z.string().uuid(),
  classScope: classScopeSchema,
});

const assignCrSchema = z.object({
  studentId: z.string().uuid(),
  slotNumber: z.number().int().min(1).max(2),
  classScope: classScopeSchema,
});

const revokeCrSchema = z.object({
  assignmentId: z.string().uuid(),
  reason: z.string().min(1),
});

export async function assignClassTeacherAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("class.assign_teacher");
  const parsed = assignTeacherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { facultyId, classScope } = parsed.data;
  const supabase = await createClient();

  // Validate that the user to be assigned is actually faculty
  const { data: faculty } = await supabase.from("profiles").select("role").eq("id", facultyId).single();
  if (!faculty || faculty.role !== "faculty") {
    return { ok: false, error: "Target user is not a faculty member." };
  }

  // Deactivate previous active class teachers for this class
  await supabase
    .from("class_teacher_assignments")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .match({ ...classScope, is_active: true });

  // Assign the new one
  const { error } = await supabase.from("class_teacher_assignments").insert({
    faculty_id: facultyId,
    ...classScope,
    assigned_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/class-assignments");
  return { ok: true, data: undefined };
}

export async function assignClassRepAction(input: unknown): Promise<ActionResult> {
  await requirePermission("class.assign_cr");
  const parsed = assignCrSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { studentId, slotNumber, classScope } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.rpc("assign_class_representative", {
    p_student_id: studentId,
    p_class_scope: classScope,
    p_slot_number: slotNumber,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/class-assignments");
  return { ok: true, data: undefined };
}

export async function revokeClassRepAction(input: unknown): Promise<ActionResult> {
  await requirePermission("class.assign_cr");
  const parsed = revokeCrSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_class_representative", {
    p_assignment_id: parsed.data.assignmentId,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/class-assignments");
  return { ok: true, data: undefined };
}
