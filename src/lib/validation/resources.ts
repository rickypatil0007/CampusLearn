import { z } from "zod";

export const RESOURCE_TYPES = [
  "lecture_notes", "presentation_slides", "lab_manual", "assignment_sheet",
  "question_bank", "previous_year_paper", "model_answer", "formula_sheet",
  "reference_material", "youtube_link", "useful_website", "syllabus", "revision_notes",
] as const;

/** Spec section 11.2 whitelist. Both extension and MIME type must match --
 * a file that only satisfies one is rejected (defends against a renamed
 * executable reporting a fake content-type, or vice versa). */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
  ".jpg", ".jpeg", ".png", ".zip",
];

const EXTENSION_TO_MIME: Record<string, readonly string[]> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".zip": ["application/zip", "application/x-zip-compressed", "application/x-7z-compressed"],
};

/** Default 95MB per-file limit (spec section 11.2); MAX_UPLOAD_SIZE_MB env
 * var overrides. Storage bucket file_size_limit (migration 0020) is the
 * hard backstop if application config is ever misconfigured higher. */
export const DEFAULT_MAX_UPLOAD_SIZE_MB = 95;
export const DEFAULT_MAX_FILES_PER_BATCH = 10;
export const DEFAULT_MAX_BATCH_TOTAL_MB = 500;

const EXECUTABLE_PATTERN = /\.(exe|sh|bat|cmd|com|scr|apk|dll|msi|jar|app|ps1|vbs|js|jse|wsf|reg|iso)(\.|$)/i;

export const uploadResourceSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    resourceType: z.enum(RESOURCE_TYPES),
    subjectId: z.string().uuid(),
    unitId: z.string().uuid().optional().or(z.literal("")),
    topicId: z.string().uuid().optional().or(z.literal("")),
    externalUrl: z.string().trim().url().optional().or(z.literal("")),
    tags: z.string().trim().optional().or(z.literal("")),
  })
  .refine((d) => d.externalUrl || ["youtube_link", "useful_website"].includes(d.resourceType) === !!d.externalUrl, {
    message: "Provide a URL for link-type resources.",
  });
export type UploadResourceInput = z.infer<typeof uploadResourceSchema>;

const classScopeSchema = z.object({
  department_id: z.string().uuid(),
  programme_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  year_of_study_id: z.string().uuid().optional().nullable(),
  semester_id: z.string().uuid(),
  division_id: z.string().uuid(),
});
export type ClassScope = z.infer<typeof classScopeSchema>;

/** Batch metadata sent to the "create batch" step, before any bytes move. */
export const createUploadBatchSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  subjectId: z.string().uuid(),
  tags: z.string().trim().optional().or(z.literal("")),
  idempotencyKey: z.string().trim().min(8).max(100),
  classScopes: z.array(classScopeSchema).min(1, "Select at least one class.").max(20),
  files: z
    .array(z.object({
      filename: z.string().trim().min(1).max(255),
      mimeType: z.string().trim().min(1),
      sizeBytes: z.number().int().positive(),
      resourceType: z.enum(RESOURCE_TYPES).default("lecture_notes"),
      unitId: z.string().uuid().optional().or(z.literal("")),
      topicId: z.string().uuid().optional().or(z.literal("")),
    }))
    .min(1, "Attach at least one file.")
    .max(DEFAULT_MAX_FILES_PER_BATCH, `A batch may contain at most ${DEFAULT_MAX_FILES_PER_BATCH} files.`),
});
export type CreateUploadBatchInput = z.infer<typeof createUploadBatchSchema>;

export const finalizeUploadBatchSchema = z.object({
  batchId: z.string().uuid(),
  files: z
    .array(z.object({
      filePath: z.string().min(1),
      originalFilename: z.string().min(1),
      mimeType: z.string().min(1),
      sizeBytes: z.number().int().positive(),
      sha256Hash: z.string().trim().optional().or(z.literal("")),
      title: z.string().trim().min(1).max(200).optional(),
      resourceType: z.enum(RESOURCE_TYPES).optional(),
      unitId: z.string().uuid().optional().or(z.literal("")),
      topicId: z.string().uuid().optional().or(z.literal("")),
    }))
    .min(1),
  classScopes: z.array(classScopeSchema).min(1),
});
export type FinalizeUploadBatchInput = z.infer<typeof finalizeUploadBatchSchema>;

export const reviewResourceSchema = z.object({
  resourceId: z.string().uuid(),
  status: z.enum(["approved", "rejected", "changes_requested"]),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type ReviewResourceInput = z.infer<typeof reviewResourceSchema>;

/** Server-side file validation -- never trust the browser's reported MIME
 * type alone. Both the extension AND the reported MIME type must be on the
 * whitelist, AND the MIME type must be one of the types associated with
 * that specific extension (defends against a ".pdf" that is actually an
 * image, or an extension/content-type mismatch used to slip past a naive
 * single-list check). */
export function isAllowedUploadFile(filename: string, mimeType: string, sizeBytes: number, maxSizeMb: number): { ok: boolean; error?: string } {
  const lower = filename.toLowerCase();

  if (EXECUTABLE_PATTERN.test(lower)) {
    return { ok: false, error: "Executable or script files are not allowed." };
  }
  if (lower.includes("..") || lower.includes("/") || lower.includes("\\")) {
    return { ok: false, error: "Invalid filename." };
  }

  const ext = ALLOWED_UPLOAD_EXTENSIONS.find((e) => lower.endsWith(e));
  if (!ext) {
    return { ok: false, error: "File type not allowed. Supported: PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, JPG/PNG, ZIP." };
  }
  if (!(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return { ok: false, error: "File type not allowed based on its content type." };
  }
  const expectedMimes = EXTENSION_TO_MIME[ext] ?? [];
  if (!expectedMimes.includes(mimeType)) {
    return { ok: false, error: `File extension "${ext}" does not match its reported content type.` };
  }
  if (sizeBytes > maxSizeMb * 1024 * 1024) {
    return { ok: false, error: `File exceeds the ${maxSizeMb}MB upload limit.` };
  }
  if (sizeBytes <= 0) {
    return { ok: false, error: "File appears to be empty." };
  }
  return { ok: true };
}

/** Batch-level checks: file count and combined size (spec section 11.2). */
export function isAllowedUploadBatch(files: { sizeBytes: number }[], maxFiles: number, maxTotalMb: number): { ok: boolean; error?: string } {
  if (files.length === 0) return { ok: false, error: "Attach at least one file." };
  if (files.length > maxFiles) return { ok: false, error: `A batch may contain at most ${maxFiles} files.` };
  const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);
  if (totalBytes > maxTotalMb * 1024 * 1024) {
    return { ok: false, error: `Batch total size exceeds ${maxTotalMb}MB.` };
  }
  return { ok: true };
}

/** Strips path separators and unsafe characters so a filename is safe to store. */
export function sanitizeFilename(filename: string): string {
  return filename
    .normalize("NFKD")
    .replace(/[^\w.\-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(-150);
}
