"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, X, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RESOURCE_TYPES, ALLOWED_UPLOAD_EXTENSIONS, DEFAULT_MAX_UPLOAD_SIZE_MB, DEFAULT_MAX_FILES_PER_BATCH } from "@/lib/validation/resources";
import { createUploadBatchAction, finalizeUploadBatchAction, abortUploadBatchAction } from "../../../resources/_actions";
import { createClient } from "@/lib/supabase/browser";

export interface SubjectOption { id: string; name: string; code: string; units: { id: string; title: string }[] }
export interface ClassOption {
  key: string;
  label: string;
  department_id: string; programme_id: string; academic_year_id: string;
  year_of_study_id: string | null; semester_id: string; division_id: string;
}

const TYPE_LABELS: Record<string, string> = {
  lecture_notes: "Lecture Notes", presentation_slides: "Presentation Slides", lab_manual: "Lab Manual",
  assignment_sheet: "Assignment Sheet", question_bank: "Question Bank", previous_year_paper: "Previous Year Paper",
  model_answer: "Model Answer", formula_sheet: "Formula Sheet", reference_material: "Reference Material",
  youtube_link: "YouTube Link", useful_website: "Useful Website", syllabus: "Syllabus", revision_notes: "Revision Notes",
};

type FileState = { id: string; file: File; status: "pending" | "uploading" | "uploaded" | "failed"; error?: string; filePath?: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MultiUploadForm({ subjects, classesBySubject }: { subjects: SubjectOption[]; classesBySubject: Record<string, ClassOption[]> }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [resourceType, setResourceType] = useState("lecture_notes");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [selectedClassKeys, setSelectedClassKeys] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<FileState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const availableClasses = useMemo(() => classesBySubject[subjectId] ?? [], [classesBySubject, subjectId]);

  // Selecting a subject clears class selections that no longer apply (dependent-control rule, spec section 9).
  function handleSubjectChange(id: string) {
    setSubjectId(id);
    setUnitId("");
    setSelectedClassKeys(new Set());
  }

  function toggleClass(key: string) {
    setSelectedClassKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: FileState[] = [];
    for (const file of Array.from(list)) {
      if (files.length + next.length >= DEFAULT_MAX_FILES_PER_BATCH) {
        toast.error(`A batch may contain at most ${DEFAULT_MAX_FILES_PER_BATCH} files.`);
        break;
      }
      const lower = file.name.toLowerCase();
      const hasAllowedExt = ALLOWED_UPLOAD_EXTENSIONS.some((ext) => lower.endsWith(ext));
      if (!hasAllowedExt) {
        toast.error(`${file.name}: unsupported file type.`);
        continue;
      }
      if (file.size > DEFAULT_MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name}: exceeds ${DEFAULT_MAX_UPLOAD_SIZE_MB}MB limit.`);
        continue;
      }
      next.push({ id: crypto.randomUUID(), file, status: "pending" });
    }
    setFiles((prev) => [...prev, ...next]);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function clearAll() {
    setFiles([]);
  }

  function resetForm() {
    setTitle(""); setDescription(""); setTags(""); setFiles([]); setSelectedClassKeys(new Set());
    setSubjectId(""); setUnitId(""); setResourceType("lecture_notes");
    if (inputRef.current) inputRef.current.value = "";
  }

  const canSubmit = !!subjectId && selectedClassKeys.size > 0 && files.length > 0 && !!title.trim() && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const classScopes = availableClasses.filter((c) => selectedClassKeys.has(c.key)).map((c) => ({
      department_id: c.department_id, programme_id: c.programme_id, academic_year_id: c.academic_year_id,
      year_of_study_id: c.year_of_study_id, semester_id: c.semester_id, division_id: c.division_id,
    }));

    const idempotencyKey = crypto.randomUUID();
    setFiles((prev) => prev.map((f) => ({ ...f, status: "pending", error: undefined })));

    const created = await createUploadBatchAction({
      title: title.trim(), description: description.trim(), subjectId, tags: tags.trim(), idempotencyKey,
      classScopes,
      files: files.map((f) => ({ filename: f.file.name, mimeType: f.file.type, sizeBytes: f.file.size, resourceType, unitId })),
    });

    if (!created.ok) {
      toast.error(created.error);
      setIsSubmitting(false);
      return;
    }

    const { batchId, uploads } = created.data;
    const supabase = createClient();
    const uploadedPaths: string[] = [];
    let allOk = true;

    setFiles((prev) => prev.map((f) => ({ ...f, status: "uploading" })));

    for (let i = 0; i < files.length; i++) {
      const localFile = files[i];
      const target = uploads[i];
      const { error } = await supabase.storage.from("resources").uploadToSignedUrl(target.filePath, target.token, localFile.file);
      if (error) {
        allOk = false;
        setFiles((prev) => prev.map((f) => (f.id === localFile.id ? { ...f, status: "failed", error: "Upload failed" } : f)));
      } else {
        uploadedPaths.push(target.filePath);
        setFiles((prev) => prev.map((f) => (f.id === localFile.id ? { ...f, status: "uploaded", filePath: target.filePath } : f)));
      }
    }

    if (!allOk) {
      await abortUploadBatchAction(batchId, uploadedPaths);
      toast.error("One or more files failed to upload. Nothing was published; please try again.");
      setIsSubmitting(false);
      return;
    }

    const finalized = await finalizeUploadBatchAction({
      batchId,
      classScopes,
      files: files.map((f, i) => ({
        filePath: uploads[i].filePath,
        originalFilename: f.file.name,
        mimeType: f.file.type,
        sizeBytes: f.file.size,
        title: files.length > 1 ? f.file.name : title.trim(),
        resourceType,
        unitId,
      })),
    });

    setIsSubmitting(false);
    if (!finalized.ok) {
      toast.error(finalized.error);
      return;
    }

    toast.success(`${files.length} file${files.length > 1 ? "s" : ""} published to ${selectedClassKeys.size} class${selectedClassKeys.size > 1 ? "es" : ""}.`);
    resetForm();
    router.push("/resources");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="title">Note title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <Label>Subject</Label>
        <Select value={subjectId} onValueChange={handleSubjectChange}>
          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {selectedSubject && selectedSubject.units.length > 0 && (
        <div>
          <Label>Unit (optional)</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
            <SelectContent>{selectedSubject.units.map((u) => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Resource type</Label>
        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{RESOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div>
        <Label>Classes {availableClasses.length > 1 ? "(select one or more)" : ""}</Label>
        {!subjectId ? (
          <p className="mt-1 text-sm text-muted-foreground">Select a subject to see your assigned classes.</p>
        ) : availableClasses.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">You are not assigned to any class for this subject.</p>
        ) : (
          <div className="mt-2 space-y-2 rounded-md border border-border p-3">
            {availableClasses.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={selectedClassKeys.has(c.key)} onCheckedChange={() => toggleClass(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Files</Label>
        <div
          className={`mt-2 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border"}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); addFiles(e.dataTransfer.files); }}
        >
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Drag files here, or</p>
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Choose files</Button>
          <input ref={inputRef} type="file" multiple hidden accept={ALLOWED_UPLOAD_EXTENSIONS.join(",")} onChange={(e) => addFiles(e.target.files)} />
          <p className="text-xs text-muted-foreground">PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, JPG/PNG, ZIP — up to {DEFAULT_MAX_UPLOAD_SIZE_MB}MB each, {DEFAULT_MAX_FILES_PER_BATCH} files max.</p>
        </div>

        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-foreground">{f.file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(f.file.size)}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {f.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {f.status === "uploaded" && <CheckCircle2 className="h-4 w-4 text-success" />}
                  {f.status === "failed" && <XCircle className="h-4 w-4 text-error" />}
                  {f.status === "pending" && (
                    <button type="button" onClick={() => removeFile(f.id)} aria-label={`Remove ${f.file.name}`}>
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={isSubmitting}>Clear all</Button>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="unit-1, exam-prep" />
      </div>

      <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
        {isSubmitting ? "Uploading…" : `Upload ${files.length || ""} file${files.length === 1 ? "" : "s"}`.trim()}
      </Button>
    </div>
  );
}
