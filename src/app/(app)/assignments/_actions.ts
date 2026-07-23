"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignmentSchema, gradeSubmissionSchema } from "@/lib/validation/assignments";
import { isAllowedUploadFile, sanitizeFilename } from "@/lib/validation/resources";
import { checkSubmissionEligibility } from "@/lib/assignments/rules";
import type { ActionResult } from "@/app/auth/actions";

const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB) || 25;
const SUBMISSIONS_BUCKET = "submissions";

export async function createAssignmentAction(input: unknown): Promise<ActionResult<{ assignmentId: string }>> {
  const user = await requirePermission("assignment.create");
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid assignment details." };

  const supabase = await createClient();
  const { data: assignment, error } = await supabase
    .from("assignments")
    .insert({
      title: parsed.data.title, instructions: parsed.data.instructions || null, subject_id: parsed.data.subjectId,
      max_marks: parsed.data.maxMarks, due_at: parsed.data.dueAt, allow_multiple_files: parsed.data.allowMultipleFiles,
      allow_resubmission: parsed.data.allowResubmission, late_submission_allowed: parsed.data.lateSubmissionAllowed,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !assignment) return { ok: false, error: error?.message ?? "Could not create assignment." };

  const { data: enrollments } = await supabase.from("subject_enrollments").select("student_id").eq("subject_id", parsed.data.subjectId);
  if (enrollments?.length) {
    await supabase.from("notifications").insert(
      enrollments.map((e) => ({
        user_id: e.student_id, type: "assignment_published" as const, title: "New assignment posted",
        body: parsed.data.title, link: `/assignments/${assignment.id}`,
      }))
    );
  }

  revalidatePath("/faculty/assignments");
  return { ok: true, data: { assignmentId: assignment.id } };
}

export async function submitAssignmentAction(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("assignment.submit");
  const assignmentId = formData.get("assignmentId") as string;
  const supabase = await createClient();

  const { data: assignment } = await supabase.from("assignments").select("due_at, allow_resubmission, allow_multiple_files, late_submission_allowed").eq("id", assignmentId).single();
  if (!assignment) return { ok: false, error: "Assignment not found." };

  const { data: existing } = await supabase.from("assignment_submissions").select("id, status").eq("assignment_id", assignmentId).eq("student_id", user.id).maybeSingle();

  const eligibility = checkSubmissionEligibility({
    dueAt: new Date(assignment.due_at), now: new Date(), lateSubmissionAllowed: assignment.late_submission_allowed,
    allowResubmission: assignment.allow_resubmission, existingStatus: (existing?.status as never) ?? null,
  });
  if (!eligibility.allowed) {
    return { ok: false, error: eligibility.reason === "deadline_passed" ? "The submission deadline has passed." : "Resubmission is not allowed for this assignment." };
  }
  const isLate = eligibility.isLate;

  const submissionId = existing?.id;
  let dbSubmissionId = submissionId;
  if (!dbSubmissionId) {
    const { data: created, error } = await supabase
      .from("assignment_submissions")
      .insert({ assignment_id: assignmentId, student_id: user.id, status: isLate ? "late" : "submitted", submitted_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: error?.message ?? "Could not submit." };
    dbSubmissionId = created.id;
  } else {
    await supabase.from("assignment_submissions").update({ status: isLate ? "late" : "submitted", submitted_at: new Date().toISOString(), marks_obtained: null, graded_by: null, graded_at: null }).eq("id", dbSubmissionId);
  }

  const files = formData.getAll("files") as File[];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const check = isAllowedUploadFile(file.name, file.type, file.size, MAX_UPLOAD_SIZE_MB);
    if (!check.ok) return { ok: false, error: check.error! };
    const path = `${user.id}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
    const { error: uploadError } = await supabase.storage.from(SUBMISSIONS_BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type });
    if (uploadError) return { ok: false, error: uploadError.message };
    await supabase.from("assignment_submission_files").insert({ submission_id: dbSubmissionId, file_path: path, original_filename: file.name, file_size_bytes: file.size });
  }

  revalidatePath(`/assignments/${assignmentId}`);
  return { ok: true, data: undefined };
}

/** Grading is server-authoritative and Faculty/Admin-only — students can never write marks_obtained (also enforced by RLS). */
export async function gradeSubmissionAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("assignment.grade");
  const parsed = gradeSubmissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid grading input." };

  const supabase = await createClient();
  const { data: submission } = await supabase.from("assignment_submissions").select("student_id, assignment_id").eq("id", parsed.data.submissionId).single();
  if (!submission) return { ok: false, error: "Submission not found." };

  const { error } = await supabase
    .from("assignment_submissions")
    .update({
      marks_obtained: parsed.data.requestResubmission ? null : parsed.data.marksObtained,
      graded_by: user.id, graded_at: new Date().toISOString(),
      status: parsed.data.requestResubmission ? "resubmission_requested" : "graded",
    })
    .eq("id", parsed.data.submissionId);
  if (error) return { ok: false, error: error.message };

  if (parsed.data.comment) {
    await supabase.from("assignment_feedback").insert({ submission_id: parsed.data.submissionId, faculty_id: user.id, comment: parsed.data.comment });
  }

  await supabase.from("audit_logs").insert({ actor_id: user.id, action: "grade_change", target_table: "assignment_submissions", target_id: parsed.data.submissionId, metadata: { marks: parsed.data.marksObtained } });
  await supabase.from("notifications").insert({
    user_id: submission.student_id, type: "assignment_graded", title: "Assignment graded",
    body: parsed.data.requestResubmission ? "Resubmission requested." : `You received ${parsed.data.marksObtained} marks.`,
    link: `/assignments/${submission.assignment_id}`,
  });

  revalidatePath(`/assignments/${submission.assignment_id}`);
  return { ok: true, data: undefined };
}

export async function getSubmissionFileUrlAction(filePath: string): Promise<ActionResult<{ url: string }>> {
  await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(SUBMISSIONS_BUCKET).createSignedUrl(filePath, 60);
  if (error || !data) return { ok: false, error: "Could not generate link." };
  return { ok: true, data: { url: data.signedUrl } };
}
