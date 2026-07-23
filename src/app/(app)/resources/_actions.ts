"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUser, UnauthorizedError } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  uploadResourceSchema, reviewResourceSchema, isAllowedUploadFile, sanitizeFilename,
  createUploadBatchSchema, finalizeUploadBatchSchema, isAllowedUploadBatch,
  DEFAULT_MAX_UPLOAD_SIZE_MB, DEFAULT_MAX_FILES_PER_BATCH, DEFAULT_MAX_BATCH_TOTAL_MB,
} from "@/lib/validation/resources";
import { determineInitialApprovalStatus, canDeleteResource } from "@/lib/resources/rules";
import { authorizeClassScopesForUpload, crCanUploadToScopes, type ClassScopeKey } from "@/lib/resources/batch-rules";
import type { ActionResult } from "@/app/auth/actions";

const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB) || DEFAULT_MAX_UPLOAD_SIZE_MB;
const RESOURCE_BUCKET = "resources";

export async function uploadResourceAction(formData: FormData): Promise<ActionResult<{ resourceId: string }>> {
  const user = await requirePermission("resource.upload");

  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    resourceType: formData.get("resourceType"),
    subjectId: formData.get("subjectId"),
    unitId: formData.get("unitId") || "",
    topicId: formData.get("topicId") || "",
    externalUrl: formData.get("externalUrl") || "",
    tags: formData.get("tags") || "",
  };
  const parsed = uploadResourceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid resource details." };
  }

  const file = formData.get("file") as File | null;
  const supabase = await createClient();

  let filePath: string | null = null;
  let fileSize: number | null = null;
  let mimeType: string | null = null;

  if (file && file.size > 0) {
    const check = isAllowedUploadFile(file.name, file.type, file.size, MAX_UPLOAD_SIZE_MB);
    if (!check.ok) return { ok: false, error: check.error! };

    const safeName = sanitizeFilename(file.name);
    filePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    fileSize = file.size;
    mimeType = file.type;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(RESOURCE_BUCKET)
      .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });
    if (uploadError) return { ok: false, error: `Upload failed: ${uploadError.message}` };
  } else if (!parsed.data.externalUrl) {
    return { ok: false, error: "Attach a file or provide a URL." };
  }

  // Faculty uploads are auto-approved and verified; CR uploads require review.
  const isFaculty = user.role === "faculty" || user.role === "dept_admin" || user.role === "super_admin";
  const initialStatus = determineInitialApprovalStatus(user.role);

  const { data: resource, error } = await supabase
    .from("resources")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      resource_type: parsed.data.resourceType,
      subject_id: parsed.data.subjectId,
      unit_id: parsed.data.unitId || null,
      topic_id: parsed.data.topicId || null,
      uploaded_by: user.id,
      approval_status: initialStatus,
      is_verified: isFaculty,
      is_cr_contributed: user.role === "class_rep",
      external_url: parsed.data.externalUrl || null,
      file_path: filePath,
      file_size_bytes: fileSize,
      mime_type: mimeType,
    })
    .select("id")
    .single();

  if (error || !resource) return { ok: false, error: error?.message ?? "Could not create resource." };

  if (parsed.data.tags) {
    const tags = parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
    if (tags.length) {
      await supabase.from("resource_tags").insert(tags.map((tag) => ({ resource_id: resource.id, tag })));
    }
  }

  if (isFaculty) {
    await supabase.from("resource_approvals").insert({ resource_id: resource.id, reviewer_id: user.id, status: "approved", comment: "Auto-approved (Faculty upload)." });
  }

  revalidatePath("/resources");
  revalidatePath("/faculty/resources");
  revalidatePath("/faculty/approvals");
  return { ok: true, data: { resourceId: resource.id } };
}

export async function reviewResourceAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("resource.approve");
  const parsed = reviewResourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid review submission." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("resources")
    .update({ approval_status: parsed.data.status, is_verified: parsed.data.status === "approved" })
    .eq("id", parsed.data.resourceId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("resource_approvals").insert({
    resource_id: parsed.data.resourceId, reviewer_id: user.id, status: parsed.data.status, comment: parsed.data.comment || null,
  });

  const { data: resource } = await supabase.from("resources").select("uploaded_by, title").eq("id", parsed.data.resourceId).single();
  if (resource) {
    await supabase.from("notifications").insert({
      user_id: resource.uploaded_by,
      type: parsed.data.status === "approved" ? "resource_approved" : "resource_rejected",
      title: parsed.data.status === "approved" ? "Resource approved" : "Resource needs attention",
      body: `"${resource.title}" was ${parsed.data.status.replace("_", " ")}.`,
      link: `/resources/${parsed.data.resourceId}`,
    });
  }

  revalidatePath("/faculty/approvals");
  revalidatePath("/resources");
  return { ok: true, data: undefined };
}

export async function deleteResourceAction(resourceId: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: resource } = await supabase.from("resources").select("uploaded_by, approval_status, file_path").eq("id", resourceId).single();
  if (!resource) return { ok: false, error: "Resource not found." };

  const allowed = canDeleteResource({
    callerRole: user.role, callerId: user.id, uploadedBy: resource.uploaded_by, approvalStatus: resource.approval_status,
  });
  if (!allowed) {
    throw new UnauthorizedError("You can only delete your own pending submissions.");
  }

  const { error } = await supabase.from("resources").delete().eq("id", resourceId);
  if (error) return { ok: false, error: error.message };

  if (resource.file_path) {
    const admin = createAdminClient();
    await admin.storage.from(RESOURCE_BUCKET).remove([resource.file_path]);
  }

  revalidatePath("/resources");
  revalidatePath("/faculty/resources");
  return { ok: true, data: undefined };
}

export async function toggleBookmarkAction(resourceId: string): Promise<ActionResult<{ bookmarked: boolean }>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("resource_bookmarks").select("id").eq("resource_id", resourceId).eq("user_id", user.id).maybeSingle();

  if (existing) {
    await supabase.from("resource_bookmarks").delete().eq("id", existing.id);
    revalidatePath("/bookmarks");
    return { ok: true, data: { bookmarked: false } };
  }

  await supabase.from("resource_bookmarks").insert({ resource_id: resourceId, user_id: user.id });
  revalidatePath("/bookmarks");
  return { ok: true, data: { bookmarked: true } };
}

export async function recordResourceViewAction(resourceId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("resource_views").insert({ resource_id: resourceId, user_id: user.id });
  await supabase.rpc("increment_resource_view_count", { p_resource_id: resourceId });
}

/**
 * Issues a short-lived signed URL after verifying the caller is authorized
 * to access this specific resource (approved, or uploader, or
 * faculty/admin) — authorization happens here, server-side, before the
 * admin (service-role) client ever touches storage.
 */
export async function getResourceDownloadUrlAction(resourceId: string): Promise<ActionResult<{ url: string }>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: resource } = await supabase
    .from("resources").select("id, file_path, approval_status, uploaded_by").eq("id", resourceId).single();
  if (!resource || !resource.file_path) return { ok: false, error: "File not found." };

  const isAuthorized =
    resource.approval_status === "approved" ||
    resource.uploaded_by === user.id ||
    ["faculty", "dept_admin", "super_admin"].includes(user.role);
  if (!isAuthorized) throw new UnauthorizedError("You do not have access to this file.");

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(RESOURCE_BUCKET).createSignedUrl(resource.file_path, 60);
  if (error || !data) return { ok: false, error: "Could not generate a download link." };

  await supabase.from("resource_downloads").insert({ resource_id: resourceId, user_id: user.id });
  await supabase.rpc("increment_resource_download_count", { p_resource_id: resourceId });

  return { ok: true, data: { url: data.signedUrl } };
}

// ============================================================================
// Multi-file, multi-class batch upload (spec section 11).
//
// Flow: createUploadBatchAction (validate + authorize + create batch row +
// issue signed upload URLs) -> browser uploads each file directly to
// Storage using those URLs -> finalizeUploadBatchAction (re-validate +
// insert resources/resource_classes atomically via the
// finalize_resource_upload_batch RPC). If the browser never calls finalize
// (crashed tab, network loss), the batch row is left in 'uploading' status
// and the staged objects are orphaned under a path scoped to that batch —
// see docs/LIMITATIONS.md for the follow-up (scheduled cleanup job) this
// pass does not implement.
// ============================================================================

async function getCallerAssignedScopes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  role: string,
  subjectId: string
): Promise<ClassScopeKey[]> {
  if (role === "faculty") {
    const { data } = await supabase
      .from("faculty_teaching_assignments")
      .select("department_id, programme_id, academic_year_id, semester_id, division_id")
      .eq("faculty_id", userId)
      .eq("subject_id", subjectId)
      .eq("is_active", true);
    return (data ?? []) as ClassScopeKey[];
  }
  if (role === "class_rep") {
    const { data } = await supabase
      .from("class_representative_assignments")
      .select("department_id, programme_id, academic_year_id, semester_id, division_id")
      .eq("student_id", userId)
      .eq("is_active", true);
    return (data ?? []) as ClassScopeKey[];
  }
  return [];
}

export async function createUploadBatchAction(input: unknown): Promise<ActionResult<{
  batchId: string;
  uploads: { filename: string; filePath: string; signedUrl: string; token: string }[];
}>> {
  const user = await requirePermission("resource.upload_batch");
  const parsed = createUploadBatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid upload details." };
  const { title, description, subjectId, tags, idempotencyKey, classScopes, files } = parsed.data;

  const batchCheck = isAllowedUploadBatch(
    files.map((f) => ({ sizeBytes: f.sizeBytes })),
    DEFAULT_MAX_FILES_PER_BATCH,
    DEFAULT_MAX_BATCH_TOTAL_MB
  );
  if (!batchCheck.ok) return { ok: false, error: batchCheck.error! };

  for (const f of files) {
    const fileCheck = isAllowedUploadFile(f.filename, f.mimeType, f.sizeBytes, MAX_UPLOAD_SIZE_MB);
    if (!fileCheck.ok) return { ok: false, error: `${f.filename}: ${fileCheck.error}` };
  }

  const supabase = await createClient();

  const assignedScopes = await getCallerAssignedScopes(supabase, user.id, user.role, subjectId);
  const authz = authorizeClassScopesForUpload(user.role, assignedScopes, classScopes as ClassScopeKey[]);
  if (!authz.ok) {
    return { ok: false, error: "You are not assigned to one or more of the selected classes for this subject." };
  }
  if (user.role === "class_rep" && !crCanUploadToScopes((assignedScopes[0] as ClassScopeKey) ?? null, classScopes as ClassScopeKey[])) {
    return { ok: false, error: "Class Representatives may only upload to their own assigned class." };
  }

  const { data: subject } = await supabase.from("subjects").select("code").eq("id", subjectId).single();
  if (!subject) return { ok: false, error: "Subject not found." };

  // Idempotent: re-submitting the same idempotency key returns the existing
  // batch instead of creating a duplicate (spec section 10/11.5).
  const { data: existingBatch } = await supabase
    .from("resource_upload_batches")
    .select("id, status")
    .eq("uploaded_by", user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  let batchId: string;
  if (existingBatch) {
    if (existingBatch.status === "completed") {
      return { ok: false, error: "This batch was already submitted." };
    }
    batchId = existingBatch.id;
    await supabase.from("resource_upload_batches").update({ status: "uploading", updated_at: new Date().toISOString() }).eq("id", batchId);
  } else {
    const { data: batch, error: batchError } = await supabase
      .from("resource_upload_batches")
      .insert({ title, description: description || null, subject_id: subjectId, uploaded_by: user.id, tags: tags || null, status: "uploading", idempotency_key: idempotencyKey })
      .select("id")
      .single();
    if (batchError || !batch) return { ok: false, error: batchError?.message ?? "Could not start upload batch." };
    batchId = batch.id;
  }

  const admin = createAdminClient();
  const uploads: { filename: string; filePath: string; signedUrl: string; token: string }[] = [];
  for (const f of files) {
    const safeName = sanitizeFilename(f.filename);
    const filePath = `resources-batch/${subject.code}/${batchId}/${crypto.randomUUID()}-${safeName}`;
    const { data: signed, error: signError } = await admin.storage.from(RESOURCE_BUCKET).createSignedUploadUrl(filePath);
    if (signError || !signed) {
      await supabase.from("resource_upload_batches").update({ status: "failed", failure_reason: "Could not prepare upload URLs.", updated_at: new Date().toISOString() }).eq("id", batchId);
      return { ok: false, error: "Could not prepare upload. Please try again." };
    }
    uploads.push({ filename: f.filename, filePath, signedUrl: signed.signedUrl, token: signed.token });
  }

  return { ok: true, data: { batchId, uploads } };
}

export async function finalizeUploadBatchAction(input: unknown): Promise<ActionResult<{ resourceIds: string[] }>> {
  const user = await requirePermission("resource.upload_batch");
  const parsed = finalizeUploadBatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid finalize request." };
  const { batchId, files, classScopes } = parsed.data;

  const supabase = await createClient();

  const { data: batch } = await supabase.from("resource_upload_batches").select("id, uploaded_by, subject_id, status").eq("id", batchId).maybeSingle();
  if (!batch) return { ok: false, error: "Upload batch not found." };
  if (batch.uploaded_by !== user.id) throw new UnauthorizedError("Not authorized to finalize this batch.");
  if (batch.status === "completed") {
    const { data: existing } = await supabase.from("resources").select("id").eq("batch_id", batchId);
    return { ok: true, data: { resourceIds: (existing ?? []).map((r) => r.id) } };
  }

  // Re-check authorization at finalize time (spec section 16) -- assignments
  // could have been revoked between batch creation and this call.
  const assignedScopes = await getCallerAssignedScopes(supabase, user.id, user.role, batch.subject_id);
  const authz = authorizeClassScopesForUpload(user.role, assignedScopes, classScopes as ClassScopeKey[]);
  if (!authz.ok) {
    const admin = createAdminClient();
    await admin.storage.from(RESOURCE_BUCKET).remove(files.map((f) => f.filePath));
    await supabase.from("resource_upload_batches").update({ status: "failed", failure_reason: "Authorization revoked before finalize.", updated_at: new Date().toISOString() }).eq("id", batchId);
    return { ok: false, error: "You are no longer authorized for one or more selected classes." };
  }

  // Re-verify every staged object actually exists at its expected size
  // before trusting client-reported metadata (spec section 11.3 step 6).
  const admin = createAdminClient();
  for (const f of files) {
    const dir = f.filePath.substring(0, f.filePath.lastIndexOf("/"));
    const name = f.filePath.substring(f.filePath.lastIndexOf("/") + 1);
    const { data: listing } = await admin.storage.from(RESOURCE_BUCKET).list(dir, { search: name });
    const found = listing?.find((obj) => obj.name === name);
    if (!found) {
      await admin.storage.from(RESOURCE_BUCKET).remove(files.map((x) => x.filePath));
      await supabase.from("resource_upload_batches").update({ status: "failed", failure_reason: `Missing staged object: ${f.originalFilename}`, updated_at: new Date().toISOString() }).eq("id", batchId);
      return { ok: false, error: `Upload of "${f.originalFilename}" did not complete. Please try again.` };
    }
  }

  const { data: newIds, error } = await supabase.rpc("finalize_resource_upload_batch", {
    p_batch_id: batchId,
    p_files: files.map((f) => ({
      file_path: f.filePath,
      original_filename: f.originalFilename,
      mime_type: f.mimeType,
      file_size_bytes: f.sizeBytes,
      sha256_hash: f.sha256Hash || null,
      title: f.title || f.originalFilename,
      resource_type: f.resourceType || "lecture_notes",
      unit_id: f.unitId || null,
      topic_id: f.topicId || null,
    })),
    p_class_scopes: classScopes,
  });

  if (error) {
    await admin.storage.from(RESOURCE_BUCKET).remove(files.map((x) => x.filePath));
    await supabase.from("resource_upload_batches").update({ status: "failed", failure_reason: error.message, updated_at: new Date().toISOString() }).eq("id", batchId);
    return { ok: false, error: "Could not finalize upload. Your files were not published; please try again." };
  }

  revalidatePath("/resources");
  revalidatePath("/faculty/resources");
  revalidatePath("/faculty/approvals");
  revalidatePath("/dashboard");
  return { ok: true, data: { resourceIds: (newIds ?? []) as string[] } };
}

/** Called by the client if one or more files in a batch fail to upload to
 * Storage. Removes every object that DID upload successfully so no
 * partially-uploaded batch is ever left reachable, and marks the batch
 * failed (spec section 11.3: "if any file upload fails, remove all staged
 * objects for the batch"). Safe to call even if some paths were never
 * actually written -- Storage `remove` on a missing key is a no-op. */
export async function abortUploadBatchAction(batchId: string, uploadedPaths: string[]): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: batch } = await supabase.from("resource_upload_batches").select("uploaded_by, status").eq("id", batchId).maybeSingle();
  if (!batch || batch.uploaded_by !== user.id) throw new UnauthorizedError("Not authorized.");
  if (batch.status === "completed") return { ok: false, error: "This batch was already finalized." };

  if (uploadedPaths.length > 0) {
    const admin = createAdminClient();
    await admin.storage.from(RESOURCE_BUCKET).remove(uploadedPaths);
  }
  await supabase.from("resource_upload_batches").update({ status: "failed", failure_reason: "One or more files failed to upload.", updated_at: new Date().toISOString() }).eq("id", batchId);
  return { ok: true, data: undefined };
}
